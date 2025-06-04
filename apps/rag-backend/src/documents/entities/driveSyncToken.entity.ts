import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';
@Entity()
export class DriveSyncToken {
  @PrimaryKey()
  uuid = v4();

  @Property()
  token!: string;

  @Property({ defaultRaw: 'now()' })
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => 'now()', defaultRaw: 'now()' })
  updatedAt?: Date = new Date();
}
