import { Document } from '../document/entities/document.entity';
import * as dotenv from 'dotenv';
import { MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { User } from '../users/entities/user.entity';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';

//const isProd = process.env['NODE_ENV'] === 'production';

dotenv.config();

export const MIKROORM_CONFIG: MikroOrmModuleOptions = {
  driver: PostgreSqlDriver,
  host: process.env['POSTGRES_HOST'],
  port: Number(process.env['POSTGRES_PORT']),
  user: process.env['POSTGRES_USER'],
  password: process.env['POSTGRES_PASSWORD'],
  dbName: process.env['POSTGRES_DB'],
  entities: [User, Document],
  extensions: [Migrator],
  debug: true,
  migrations: {
    path: './migrations', // or 'dist/migrations'
    pathTs: './migrations', // ts path for dev
    glob: '!(*.d).{js,ts}',
    transactional: true,
    disableForeignKeys: false,
    allOrNothing: true,
    emit: 'ts', // use 'js' in production
  },
};

export default MIKROORM_CONFIG;
