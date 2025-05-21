'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20250521134326 extends Migration {

  async up() {
    this.addSql(`alter table "document" drop constraint if exists "document_type_check";`);

    this.addSql(`alter table "document" drop column "content";`);

    this.addSql(`alter table "document" add column "word_count" int null;`);
    this.addSql(`alter table "document" add constraint "document_type_check" check("type" in ('document', 'pdfdocument', 'txtdocument', 'docxdocument'));`);
  }

  async down() {
    this.addSql(`alter table "document" drop constraint if exists "document_type_check";`);

    this.addSql(`alter table "document" drop column "word_count";`);

    this.addSql(`alter table "document" add column "content" varchar(255) null;`);
    this.addSql(`alter table "document" add constraint "document_type_check" check("type" in ('document', 'pdfdocument', 'txtdocument'));`);
  }

}
exports.Migration20250521134326 = Migration20250521134326;
