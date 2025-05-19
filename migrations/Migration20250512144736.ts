import { Migration } from '@mikro-orm/migrations';

export class Migration20250512144736 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "document_vector" add column "type" varchar(255) not null;`
    );
  }

  async down(): Promise<void> {
    this.addSql(`alter table "document_vector" drop column "type";`);
  }
}
