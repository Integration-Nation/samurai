import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
  ManyToOne,
} from '@mikro-orm/core';
import { Message } from './message.entity';
import { v4 as uuid } from 'uuid';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Conversation {
  @PrimaryKey()
  id: string = uuid();

  @Property({ nullable: true })
  title?: string;

  @OneToMany(() => Message, (message) => message.conversation)
  messages = new Collection<Message>(this);

  @ManyToOne(() => User)
  user!: User;

  @Property()
  createdAt: Date = new Date();
}
