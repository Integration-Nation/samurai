/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
// import { MikroORM } from '@mikro-orm/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // const orm = app.get(MikroORM);
  // const migrator = orm.getMigrator();

  // await orm.getMigrator().up();

  // const pendingMigrations = await migrator.getPendingMigrations();
  // if (pendingMigrations.length > 0) {
  //   Logger.log(
  //     `Found ${pendingMigrations.length} pending migrations, running...`
  //   );
  //   Logger.log('All migrations executed successfully');
  // } else {
  //   Logger.log('No pending migrations found');
  // }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
