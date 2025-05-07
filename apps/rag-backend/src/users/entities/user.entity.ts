import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';

export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}
@Entity()
export class User {
  @PrimaryKey()
  uuid = v4();

  @Property()
  name!: string;

  @Property({ unique: true })
  email!: string;

  @Property()
  password!: string;

  @Enum({
    items: () => UserRole,
    nativeEnumName: 'user_role',
    default: UserRole.MEMBER,
  })
  role!: UserRole;

  @Property({ defaultRaw: 'now()' })
  createdAt?: Date;

  @Property({ onUpdate: () => 'now()', defaultRaw: 'now()' })
  updatedAt?: Date;
}
