import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/core';

import { v4 } from 'uuid';

@Entity({ discriminatorColumn: 'type' })
export abstract class Document {
  @PrimaryKey()
  uuid = v4();

  @Property()
  fileName!: string;

  @Property({ nullable: true })
  creationDate?: string;

  @Property({ nullable: true })
  modDate?: string;

  // Drive tracking felter
  @Property({ nullable: true })
  @Index()
  driveFileId?: string;

  @Property({ nullable: true })
  driveModifiedTime?: Date;

  @Property({ nullable: true })
  driveMimeType?: string;

  @Property({ defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => 'now()', defaultRaw: 'now()' })
  updatedAt: Date = new Date();
}
