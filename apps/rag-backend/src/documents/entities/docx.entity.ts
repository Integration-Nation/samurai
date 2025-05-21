import { Entity, Property } from '@mikro-orm/core';
import { Document } from './document.entity';

@Entity()
export class DOCXDocument extends Document {
  @Property()
  wordCount!: number;
}
