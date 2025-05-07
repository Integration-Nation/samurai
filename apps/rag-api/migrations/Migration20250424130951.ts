import { Migration } from '@mikro-orm/migrations';

export class Migration20250424130951 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create type "user_role" as enum ('admin', 'member', 'guest');`,
    );
    this.addSql(
      `create table "document" ("uuid" varchar(255) not null, "content" text not null, "embedding" varchar(255) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "document_pkey" primary key ("uuid"));`,
    );

    this.addSql(
      `create table "user" ("uuid" varchar(255) not null, "name" varchar(255) not null, "email" varchar(255) not null, "password" varchar(255) not null, "role" "user_role" not null default 'member', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "user_pkey" primary key ("uuid"));`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "document" cascade;`);

    this.addSql(`drop table if exists "user" cascade;`);

    this.addSql(`drop type "user_role";`);
  }
}
