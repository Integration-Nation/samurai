'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20250530132957 extends Migration {

  async up() {
    this.addSql(`alter table "user" drop constraint "user_pkey";`);
    this.addSql(`alter table "user" drop column "uuid", drop column "password", drop column "role";`);

    this.addSql(`alter table "user" add column "id" varchar(255) not null, add column "username" varchar(255) not null;`);
    this.addSql(`alter table "user" add constraint "user_pkey" primary key ("id");`);

    this.addSql(`drop type "user_role";`);
  }

  async down() {
    this.addSql(`create type "user_role" as enum ('admin', 'member', 'guest');`);
    this.addSql(`alter table "user" drop constraint "user_pkey";`);
    this.addSql(`alter table "user" drop column "id", drop column "username";`);

    this.addSql(`alter table "user" add column "uuid" varchar(255) not null, add column "password" varchar(255) not null, add column "role" "user_role" not null default 'member';`);
    this.addSql(`alter table "user" add constraint "user_pkey" primary key ("uuid");`);
  }

}
exports.Migration20250530132957 = Migration20250530132957;
