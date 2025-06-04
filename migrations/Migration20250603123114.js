'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20250603123114 extends Migration {

  async up() {
    this.addSql(`alter table "message" alter column "content" type text using ("content"::text);`);
  }

  async down() {
    this.addSql(`alter table "message" alter column "content" type varchar(255) using ("content"::varchar(255));`);
  }

}
exports.Migration20250603123114 = Migration20250603123114;
