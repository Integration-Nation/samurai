import { Entity, Property } from '@mikro-orm/core';
import { Document } from './document.entity';

@Entity()
export class TXTDocument extends Document {
  @Property()
  lineCount!: number;
}
