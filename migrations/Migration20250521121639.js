'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20250521121639 extends Migration {

  async up() {
    this.addSql(`alter table "document" add column "filename" varchar(255) not null, add column "type" text check ("type" in ('document', 'pdfdocument')) not null;`);
    this.addSql(`alter table "document" alter column "num_pages" type int using ("num_pages"::int);`);
    this.addSql(`alter table "document" alter column "num_pages" drop not null;`);
    this.addSql(`create index "document_type_index" on "document" ("type");`);
  }

  async down() {
    this.addSql(`drop index "document_type_index";`);
    this.addSql(`alter table "document" drop column "filename", drop column "type";`);

    this.addSql(`alter table "document" alter column "num_pages" type int using ("num_pages"::int);`);
    this.addSql(`alter table "document" alter column "num_pages" set not null;`);
  }

}
exports.Migration20250521121639 = Migration20250521121639;
