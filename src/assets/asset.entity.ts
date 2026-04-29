import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

export enum AssetStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  TOKENIZED = 'tokenized',
  RETIRED = 'retired',
}

@Entity('assets')
@Index(['createdById'])
@Index(['status'])
@Index(['jurisdiction'])
export class AssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255 })
  propertyAddress: string;

  @Column({ type: 'varchar', length: 20 })
  jurisdiction: string; // 'UAE', 'US', etc.

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  estimatedValue: number; // Encrypted at application layer

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  tokenizedAmount: number;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => UserEntity, (user) => user.createdAssets)
  createdBy: UserEntity;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.DRAFT,
  })
  status: AssetStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractAddress: string; // ERC-3643 token contract address

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractTxHash: string; // Blockchain transaction hash for minting

  @Column({ type: 'text', nullable: true })
  encryptedMetadata: string; // Encrypted asset-specific data

  @Column({ type: 'text', nullable: true })
  encryptedDocumentReferences: string; // Encrypted links to S3 documents

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  approvedBy: string; // User ID of approver
}
