import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class CreateVouches1593566660925 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vouches (
        id int GENERATED ALWAYS AS IDENTITY,
        voucher_id text NOT NULL,
        vouched_id text NOT NULL,
        amount int NOT NULL,
        reason text NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );
    `);

    await queryRunner.createIndex(
      'vouches',
      new TableIndex({
        name: 'idx_vouches_voucher_id',
        columnNames: ['voucher_id'],
      })
    );

    await queryRunner.createIndex(
      'vouches',
      new TableIndex({
        name: 'idx_vouches_vouched_id',
        columnNames: ['vouched_id'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('vouches', 'idx_vouches_voucher_id');
    await queryRunner.dropIndex('vouches', 'idx_vouches_vouched_id');
    await queryRunner.dropTable('vouches', true);
  }
}
