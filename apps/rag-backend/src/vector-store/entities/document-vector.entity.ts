import {
  Entity,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { VectorType } from 'pgvector/mikro-orm';
import { Document } from '../../documents/entities/document.entity';
import { v4 } from 'uuid';

export type Vector = number[];
export enum DocumentVectorType {
  TEXT = 'text',
  IMAGE = 'image',
}

@Entity()
export class DocumentVector {
  @PrimaryKey()
  uuid = v4();

  @Property({ type: 'text' })
  content!: string;

  @Property({ type: VectorType, columnType: 'vector(1536)' })
  @Index()
  embedding!: Vector;

  @ManyToOne(() => Document, { nullable: true })
  document!: Document;

  @Property()
  @Index()
  type!: DocumentVectorType;

  @Property({ defaultRaw: 'now()' })
  createdAt?: Date;

  @Property({ onUpdate: () => 'now()', defaultRaw: 'now()' })
  updatedAt?: Date;
}
