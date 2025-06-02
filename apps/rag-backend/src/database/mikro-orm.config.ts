import { Document } from '../documents/entities/document.entity';
import * as dotenv from 'dotenv';
import { MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { User } from '../users/entities/user.entity';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { PDFDocument } from '../documents/entities/pdf.entity';
import { DocumentVector } from '../vector-store/entities/document-vector.entity';
import { TXTDocument } from '../documents/entities/txt.entity';
import { DOCXDocument } from '../documents/entities/docx.entity';
import { Message } from '../rag/entities/message.entity';
import { Conversation } from '../rag/entities/conversation.entity';

//const isProd = process.env['NODE_ENV'] === 'production';

dotenv.config();

export const MIKROORM_CONFIG: MikroOrmModuleOptions = {
  driver: PostgreSqlDriver,
  host: process.env['POSTGRES_HOST'],
  port: Number(process.env['POSTGRES_PORT']),
  user: process.env['POSTGRES_USER'],
  password: process.env['POSTGRES_PASSWORD'],
  dbName: process.env['POSTGRES_DB'],
  entities: [
    User,
    Document,
    PDFDocument,
    DocumentVector,
    TXTDocument,
    DOCXDocument,
    Message,
    Conversation,
  ],
  extensions: [Migrator],
  debug: true,
  migrations: {
    path: './migrations', // or 'dist/migrations'
    pathTs: './migrations', // ts path for dev
    glob: '!(*.d).{js,ts}',
    transactional: true,
    disableForeignKeys: false,
    allOrNothing: true,
    emit: 'js', // use 'js' in production
  },
};

export default MIKROORM_CONFIG;
