import { Module } from '@nestjs/common';
import MIKROORM_CONFIG from './mikro-orm.config';
import { MikroOrmModule } from '@mikro-orm/nestjs';

@Module({
  imports: [MikroOrmModule.forRoot(MIKROORM_CONFIG)],
  controllers: [],
  providers: [],
  exports: [],
})
export class DatabaseModule {}
