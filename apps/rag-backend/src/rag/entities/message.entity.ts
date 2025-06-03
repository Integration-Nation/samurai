import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Index,
} from '@mikro-orm/core';
import { Conversation } from './conversation.entity';
import { v4 as uuid } from 'uuid';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Message {
  @PrimaryKey()
  id: string = uuid();

  @Property()
  role!: 'user' | 'assistant' | 'system';

  @Property({ type: 'text' })
  content!: string;

  @ManyToOne(() => Conversation)
  conversation!: Conversation;

  @ManyToOne(() => User)
  @Index()
  user!: User;

  @Property()
  createdAt: Date = new Date();
}
