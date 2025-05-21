'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20250521123656 extends Migration {

  async up() {
    this.addSql(`alter table "document" drop constraint if exists "document_type_check";`);

    this.addSql(`alter table "document" add column "line_count" int null, add column "content" varchar(255) null;`);
    this.addSql(`alter table "document" add constraint "document_type_check" check("type" in ('document', 'pdfdocument', 'txtdocument'));`);
    this.addSql(`alter table "document" rename column "filename" to "file_name";`);
  }

  async down() {
    this.addSql(`alter table "document" drop constraint if exists "document_type_check";`);

    this.addSql(`alter table "document" drop column "line_count", drop column "content";`);

    this.addSql(`alter table "document" add constraint "document_type_check" check("type" in ('document', 'pdfdocument'));`);
    this.addSql(`alter table "document" rename column "file_name" to "filename";`);
  }

}
exports.Migration20250521123656 = Migration20250521123656;
