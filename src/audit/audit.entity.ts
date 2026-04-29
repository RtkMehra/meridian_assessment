import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
@Entity('audit_logs')
@Index(['userId'])
@Index(['resourceId'])
@Index(['action'])
@Index(['createdAt'])
export class AuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  action: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  resourceId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  resourceType: string;

  @Column({ type: 'text', nullable: true })
  beforeValues: string;

  @Column({ type: 'text', nullable: true })
  afterValues: string;

  @Column({ type: 'varchar', length: 50, default: 'api' })
  sourceType: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  status: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'text', nullable: true })
  metadata: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'varchar', length: 64 })
  contentHash: string;
}
