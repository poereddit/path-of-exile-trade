import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'vouches' })
export class Vouch {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'voucher_id' })
  voucherId!: string;

  @Column({ name: 'vouched_id' })
  vouchedId!: string;

  @Column()
  reason!: string;

  @Column()
  amount!: number;

  @Column({ name: 'created_at' })
  createdAt!: string;

  @Column({ name: 'updated_at' })
  updatedAt!: string;
}
