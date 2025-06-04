'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20250602143901 extends Migration {

  async up() {
    this.addSql(`alter table "conversation" add column "user_id" varchar(255) not null;`);
    this.addSql(`alter table "conversation" add constraint "conversation_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);

    this.addSql(`alter table "message" add column "user_id" varchar(255) not null;`);
    this.addSql(`alter table "message" add constraint "message_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);
  }

  async down() {
    this.addSql(`alter table "conversation" drop constraint "conversation_user_id_foreign";`);

    this.addSql(`alter table "message" drop constraint "message_user_id_foreign";`);

    this.addSql(`alter table "conversation" drop column "user_id";`);

    this.addSql(`alter table "message" drop column "user_id";`);
  }

}
exports.Migration20250602143901 = Migration20250602143901;
