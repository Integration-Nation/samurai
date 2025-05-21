import { Entity, Property } from '@mikro-orm/core';
import { Document } from './document.entity';

@Entity()
export class PDFDocument extends Document {
  @Property()
  numPages!: number;

  @Property({ nullable: true })
  title?: string;

  @Property({ nullable: true })
  author?: string;

  @Property({ nullable: true })
  subject?: string;

  @Property({ nullable: true })
  keywords?: string;

  @Property({ nullable: true })
  creator?: string;

  @Property({ nullable: true })
  producer?: string;
}
