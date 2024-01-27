import { DataSource } from 'typeorm';

export const dbDataSource = new DataSource({
  type: process.env.TYPEORM_CONNECTION as 'postgres',
  host: process.env.TYPEORM_HOST,
  username: process.env.TYPEORM_USERNAME,
  database: process.env.TYPEORM_DATABASE,
  entities: [process.env.TYPEORM_ENTITIES!],
  migrations: [process.env.TYPEORM_MIGRATIONS!],
  synchronize: !!process.env.TYPEORM_DATABASE,
});
