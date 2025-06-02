import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../database/database.module';
import { DocumentModule } from '../documents/document.module';
import { RagService } from '../rag/rag.service';
import { RagModule } from '../rag/rag.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { RerankingModule } from '../reranking/reranking.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { ConfigModule } from '@nestjs/config';
<<<<<<< Updated upstream
import Joi from 'joi';
import config from '../config/config';
import { AuthModule } from '../auth/auth.module';
=======
import { NotionModule } from '../notion/notion.module';


>>>>>>> Stashed changes

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
<<<<<<< Updated upstream
      load: [config],
      validationSchema: Joi.object({
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().required(),
      }),
    }),
    AuthModule,
=======
    }),
>>>>>>> Stashed changes
    UsersModule,
    DatabaseModule,
    DocumentModule,
    RagModule,
    VectorStoreModule,
    RerankingModule,
    EmbeddingsModule,
    GoogleDriveModule,
    NotionModule
  ],
  controllers: [AppController],
  providers: [AppService, RagService],
})
export class AppModule {}
