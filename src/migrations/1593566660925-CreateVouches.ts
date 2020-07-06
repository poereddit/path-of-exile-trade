import { MigrationInterface, QueryRunner, TableIndex, TableUnique } from 'typeorm';

export class CreateVouches1593566660925 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vouches (
        id int GENERATED ALWAYS AS IDENTITY,
        message_id text NOT NULL,
        voucher_id text NOT NULL,
        vouched_id text NOT NULL,
        amount int NOT NULL,
        reason text NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );
    `);

    await queryRunner.createUniqueConstraint(
      'vouches',
      new TableUnique({
        name: 'ix_vouches_message_id',
        columnNames: ['message_id'],
      })
    );

    await queryRunner.createIndex(
      'vouches',
      new TableIndex({
        name: 'ix_vouches_voucher_id',
        columnNames: ['voucher_id'],
      })
    );

    await queryRunner.createIndex(
      'vouches',
      new TableIndex({
        name: 'ix_vouches_vouched_id',
        columnNames: ['vouched_id'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('vouches', 'ix_vouches_message_id');
    await queryRunner.dropIndex('vouches', 'ix_vouches_voucher_id');
    await queryRunner.dropIndex('vouches', 'ix_vouches_vouched_id');
    await queryRunner.dropTable('vouches', true);
  }
}
