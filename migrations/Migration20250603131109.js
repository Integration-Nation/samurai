'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { Migration } = require('@mikro-orm/migrations');

class Migration20250603131109 extends Migration {
  async up() {
    this.addSql(
      `alter table "document_vector" alter column "embedding" type vector(1536) using ("embedding"::vector(1536));`
    );

    this.addSql(
      `CREATE INDEX document_vector_embedding_idx ON document_vector USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);`
    );

    this.addSql(
      `create index "document_vector_type_index" on "document_vector" ("type");`
    );

    this.addSql(
      `create index "conversation_user_id_index" on "conversation" ("user_id");`
    );

    this.addSql(
      `create index "message_user_id_index" on "message" ("user_id");`
    );
  }

  async down() {
    this.addSql(`drop index "document_vector_embedding_idx";`);

    this.addSql(`drop index "document_vector_type_index";`);

    this.addSql(`drop index "conversation_user_id_index";`);

    this.addSql(`drop index "message_user_id_index";`);

    this.addSql(
      `alter table "document_vector" alter column "embedding" type vector using ("embedding"::vector);`
    );
  }
}
exports.Migration20250603131109 = Migration20250603131109;
