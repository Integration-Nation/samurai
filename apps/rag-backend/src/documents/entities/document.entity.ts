import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';

import { v4 } from 'uuid';
import { DocumentVector } from '../../vector-store/entities/document-chunk.entity';

//* PDF DOCUMENTS
@Entity()
export class Document {
  @PrimaryKey()
  uuid = v4();

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

  @Property({ nullable: true })
  creationDate?: string;

  @Property({ nullable: true })
  modDate?: string;

  @OneToMany(() => DocumentVector, (chunk) => chunk.document)
  chunks = new Collection<DocumentVector>(this);

  @Property({ defaultRaw: 'now()' })
  createdAt?: Date;

  @Property({ onUpdate: () => 'now()', defaultRaw: 'now()' })
  updatedAt?: Date;
}
