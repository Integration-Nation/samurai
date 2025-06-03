'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20250603142604 extends Migration {

  async up() {
    this.addSql(`create table "drive_sync_token" ("uuid" varchar(255) not null, "token" varchar(255) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "drive_sync_token_pkey" primary key ("uuid"));`);

    this.addSql(`alter table "document" add column "drive_file_id" varchar(255) null, add column "drive_modified_time" timestamptz null, add column "drive_mime_type" varchar(255) null;`);
    this.addSql(`create index "document_drive_file_id_index" on "document" ("drive_file_id");`);
  }

  async down() {
    this.addSql(`drop table if exists "drive_sync_token" cascade;`);

    this.addSql(`drop index "document_drive_file_id_index";`);
    this.addSql(`alter table "document" drop column "drive_file_id", drop column "drive_modified_time", drop column "drive_mime_type";`);
  }

}
exports.Migration20250603142604 = Migration20250603142604;
