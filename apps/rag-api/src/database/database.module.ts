import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TYPEORM_CONFIG } from './typeorm.config';

@Module({
  imports: [TypeOrmModule.forRoot(TYPEORM_CONFIG)],
  controllers: [],
  providers: [],
  exports: [],
})
export class DatabaseModule {}
