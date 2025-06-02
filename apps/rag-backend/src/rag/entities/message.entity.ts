import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Conversation } from './conversation.entity';
import { v4 as uuid } from 'uuid';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Message {
  @PrimaryKey()
  id: string = uuid();

  @Property()
  role!: 'user' | 'assistant' | 'system';

  @Property()
  content!: string;

  @Property()
  createdAt: Date = new Date();

  @ManyToOne(() => Conversation)
  conversation!: Conversation;

  @ManyToOne(() => User)
  user!: User;
}
