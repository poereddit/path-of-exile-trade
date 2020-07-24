import { EntityManager, EntityRepository } from 'typeorm';

import { Vouch } from '../entities/vouch';

@EntityRepository()
export class VouchRepository {
  constructor(private manager: EntityManager) {}

  async saveVouch(vouch: Partial<Vouch>): Promise<void> {
    await this.manager.createQueryBuilder().insert().into(Vouch).values([vouch]).execute();
  }

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
  }

  async getLastVouch(): Promise<Vouch | null> {
    return (await this.manager.createQueryBuilder(Vouch, 'vouch').select().orderBy('vouch.createdAt', 'DESC').limit(1).getOne()) ?? null;
  }
}
