'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20250602130212 extends Migration {

  async up() {
    this.addSql(`create table "conversation" ("id" varchar(255) not null, "title" varchar(255) null, "created_at" timestamptz not null, constraint "conversation_pkey" primary key ("id"));`);

    this.addSql(`create table "message" ("id" varchar(255) not null, "role" varchar(255) not null, "content" varchar(255) not null, "created_at" timestamptz not null, "conversation_id" varchar(255) not null, constraint "message_pkey" primary key ("id"));`);

    this.addSql(`alter table "message" add constraint "message_conversation_id_foreign" foreign key ("conversation_id") references "conversation" ("id") on update cascade;`);
  }

  async down() {
    this.addSql(`alter table "message" drop constraint "message_conversation_id_foreign";`);

    this.addSql(`drop table if exists "conversation" cascade;`);

    this.addSql(`drop table if exists "message" cascade;`);
  }

}
exports.Migration20250602130212 = Migration20250602130212;
