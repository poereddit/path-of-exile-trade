import 'reflect-metadata';
import { dbDataSource } from '../data-source';
import { UnsavedVouch, Vouch } from '../entities/vouch';
import { VouchSummary } from '../models/vouch-summary';

export type VouchRepository = typeof vouchRepository;
export const vouchRepository = dbDataSource.getRepository(Vouch).extend({
  async saveVouch(vouch: UnsavedVouch): Promise<Vouch> {
    const result = await this.manager.createQueryBuilder().insert().into(Vouch).values(vouch).returning('id').execute();
    const vouchWithId: Vouch = {
      ...vouch,
      id: (result.identifiers[0] as { id: number }).id,
    };

    return vouchWithId;
  },
  async findLastVouchForVouchedByVoucher(queryParams: { vouchedId: string; voucherId: string }): Promise<Vouch | null> {
    const { vouchedId, voucherId } = queryParams;

    return (
      (await this.manager
        .createQueryBuilder(Vouch, 'vouch')
        .select()
        .where('vouch.voucher_id = :voucherId', { voucherId })
        .andWhere('vouch.vouched_id = :vouchedId', { vouchedId })
        .orderBy('vouch.createdAt', 'DESC')
        .limit(1)
        .getOne()) ?? null
    );
  },
  async getLastVouch(): Promise<Vouch | null> {
    return (await this.createQueryBuilder('vouch').orderBy('vouch.createdAt', 'DESC').limit(1).getOne()) ?? null;
  },
  async deleteVouch(id: string): Promise<void> {
    await this.manager.createQueryBuilder().delete().from(Vouch).where('message_id = :id', { id }).execute();
  },
  async getVouchSummary(vouchedId: string): Promise<VouchSummary> {
    const [recentPositiveVouches, recentNegativeVouches, uniqueVouchers, positiveVouches, negativeVouches] = await Promise.all([
      this.getLastVouchesForUser(vouchedId, { positive: true, count: 5 }),
      this.getLastVouchesForUser(vouchedId, { positive: false, count: 5 }),
      this.getUniqueVouchers(vouchedId),
      this.getPositiveVouchCount(vouchedId),
      this.getNegativeVouchCount(vouchedId),
    ]);

    return {
      vouchScore: positiveVouches - negativeVouches,
      uniqueVouchers,
      recentPositiveVouches,
      recentNegativeVouches,
      positiveVouches,
      negativeVouches,
    };
  },
  async getPositiveVouchCount(vouchedId: string): Promise<number> {
    const positiveVouchCountQueryResult = (await this.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(Vouch, 'vouch')
      .where('vouch.vouched_id = :vouchedId', { vouchedId })
      .andWhere('amount = 1')
      .execute()) as { count: string }[] | undefined;

    if (!positiveVouchCountQueryResult) {
      return 0;
    }

    return +positiveVouchCountQueryResult[0].count;
  },
  async getNegativeVouchCount(vouchedId: string): Promise<number> {
    const negativeVouchCountQueryResult = (await this.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(Vouch, 'vouch')
      .where('vouch.vouched_id = :vouchedId', { vouchedId })
      .andWhere('amount = -1')
      .execute()) as { count: string }[] | undefined;

    if (!negativeVouchCountQueryResult) {
      return 0;
    }

    return +negativeVouchCountQueryResult[0].count;
  },
  async getUniqueVouchers(vouchedId: string): Promise<number> {
    const uniqueVouchersQueryResult = (await this.manager
      .createQueryBuilder()
      .select('COUNT(DISTINCT voucher_id)', 'count')
      .from(Vouch, 'vouch')
      .where('vouch.vouched_id = :vouchedId', { vouchedId })
      .execute()) as { count: string }[] | undefined;

    if (!uniqueVouchersQueryResult) {
      return 0;
    }

    return +uniqueVouchersQueryResult[0].count;
  },
  async getLastVouchesForUser(
    vouchedId: string,
    options: { positive: boolean; count: number } = { positive: true, count: 5 },
  ): Promise<Vouch[]> {
    const lastVouches = await this.manager
      .createQueryBuilder(Vouch, 'vouch')
      .where('vouched_id = :vouchedId', { vouchedId })
      .andWhere('amount = :amount', { amount: options.positive ? 1 : -1 })
      .orderBy('created_at', 'DESC')
      .limit(options.count)
      .getMany();

    return lastVouches;
  },
});
