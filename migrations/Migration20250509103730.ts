import { Migration } from '@mikro-orm/migrations';

export class Migration20250509103730 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`CREATE EXTENSION IF NOT EXISTS vector;`);
    this.addSql(`create type "user_role" as enum ('admin', 'member', 'guest');`);
    this.addSql(`create table "document" ("uuid" varchar(255) not null, "num_pages" int not null, "title" varchar(255) null, "author" varchar(255) null, "subject" varchar(255) null, "keywords" varchar(255) null, "creator" varchar(255) null, "producer" varchar(255) null, "creation_date" varchar(255) null, "mod_date" varchar(255) null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "document_pkey" primary key ("uuid"));`);

    this.addSql(`create table "document_chunk" ("uuid" varchar(255) not null, "content" text not null, "embedding" vector not null, "document_uuid" varchar(255) null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "document_chunk_pkey" primary key ("uuid"));`);

    this.addSql(`create table "user" ("uuid" varchar(255) not null, "name" varchar(255) not null, "email" varchar(255) not null, "password" varchar(255) not null, "role" "user_role" not null default 'member', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "user_pkey" primary key ("uuid"));`);
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`);

    this.addSql(`alter table "document_chunk" add constraint "document_chunk_document_uuid_foreign" foreign key ("document_uuid") references "document" ("uuid") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "document_chunk" drop constraint "document_chunk_document_uuid_foreign";`);

    this.addSql(`drop table if exists "document" cascade;`);

    this.addSql(`drop table if exists "document_chunk" cascade;`);

    this.addSql(`drop table if exists "user" cascade;`);

    this.addSql(`drop type "user_role";`);
    this.addSql('DROP EXTENSION IF EXISTS vector;');
  }

}
