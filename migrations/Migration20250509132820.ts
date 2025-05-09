import { Migration } from '@mikro-orm/migrations';

export class Migration20250509132820 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "document_vector" ("uuid" varchar(255) not null, "content" text not null, "embedding" vector not null, "document_uuid" varchar(255) null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "document_vector_pkey" primary key ("uuid"));`);

    this.addSql(`alter table "document_vector" add constraint "document_vector_document_uuid_foreign" foreign key ("document_uuid") references "document" ("uuid") on update cascade on delete set null;`);

    this.addSql(`drop table if exists "document_chunk" cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`create table "document_chunk" ("uuid" varchar(255) not null, "content" text not null, "embedding" vector not null, "document_uuid" varchar(255) null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "document_chunk_pkey" primary key ("uuid"));`);

    this.addSql(`alter table "document_chunk" add constraint "document_chunk_document_uuid_foreign" foreign key ("document_uuid") references "document" ("uuid") on update cascade on delete set null;`);

    this.addSql(`drop table if exists "document_vector" cascade;`);
  }

}
