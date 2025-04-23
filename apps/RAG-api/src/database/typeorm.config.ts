import { DataSource, DataSourceOptions } from 'typeorm';
import { Document } from 'src/document/entities/document.entity';

//const isProd = process.env['NODE_ENV'] === 'production';
import * as dotenv from 'dotenv';
import { User } from 'src/users/entities/user.entity';
dotenv.config();

export const TYPEORM_CONFIG = {
  type: 'postgres',
  host: process.env['POSTGRES_HOST'],
  port: Number(process.env['POSTGRES_PORT']),
  username: process.env['POSTGRES_USER'],
  password: process.env['POSTGRES_PASSWORD'],
  database: process.env['POSTGRES_DB'],
  synchronize: true,
  installExtensions: true,
  entities: [User, Document],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'], // only with __dirname to apply migration
  migrationsTableName: 'migrations',
} satisfies DataSourceOptions;

export default new DataSource(TYPEORM_CONFIG);
