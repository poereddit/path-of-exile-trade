import 'dotenv/config';
import { DataSource } from 'typeorm';

export const dbDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TYPEORM_HOST,
  username: process.env.TYPEORM_USERNAME,
  database: process.env.TYPEORM_DATABASE,
  entities: [process.env.TYPEORM_ENTITIES!],
  migrations: [process.env.TYPEORM_MIGRATIONS!],
  migrationsTableName: 'migrations',
  synchronize: !!process.env.TYPEORM_SYNCHRONIZE,
  logging: false,
  migrationsRun: false,
});
