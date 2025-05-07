import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../database/database.module';
import { DocumentModule } from '../document/document.module';
import { RagService } from '../rag/rag.service';
import { OpenAiModule } from '../rag/rag.module';

@Module({
  imports: [UsersModule, DatabaseModule, DocumentModule, OpenAiModule],
  controllers: [AppController],
  providers: [AppService, RagService],
})
export class AppModule {}
