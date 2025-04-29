import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { VectorType } from 'pgvector/mikro-orm';
import { Document } from './document.entity';
import { v4 } from 'uuid';

export type Vector = number[];

@Entity()
export class DocumentChunk {
  @PrimaryKey()
  uuid = v4();

  @Property({ type: 'text' })
  content: string;

  @Property({ type: VectorType })
  embedding: Vector;

  @ManyToOne(() => Document, { nullable: true })
  document?: Document;

  @Property({ defaultRaw: 'now()' })
  createdAt?: Date;

  @Property({ onUpdate: () => 'now()', defaultRaw: 'now()' })
  updatedAt?: Date;
}
