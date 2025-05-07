import { Migration } from '@mikro-orm/migrations';

export class Migration20250424142811 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`CREATE EXTENSION IF NOT EXISTS vector;`);

    this.addSql(
      `alter table "document" alter column "embedding" type vector using ("embedding"::vector);`,
    );

    this.addSql(
      `alter table "user" add constraint "user_email_unique" unique ("email");`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "document" alter column "embedding" type varchar(255) using ("embedding"::varchar(255));`,
    );

    this.addSql(`alter table "user" drop constraint "user_email_unique";`);

    this.addSql('DROP EXTENSION IF EXISTS vector;');
  }
}
