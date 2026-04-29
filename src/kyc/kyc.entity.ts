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

export enum KycStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('kyc_records')
@Index(['userId'])
@Index(['status'])
export class KycEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.kycRecords, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  status: KycStatus;

  @Column({ type: 'text' })
  encryptedDocumentData: string; // Encrypted KYC document reference

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerReference: string; // Reference to KYC provider (e.g., Onfido)

  @Column({ type: 'varchar', length: 20, nullable: true })
  jurisdiction: string;

  @Column({ type: 'boolean', default: false })
  amlFlagged: boolean;

  @Column({ type: 'text', nullable: true })
  amlFlagReason: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewedBy: string; // User ID of reviewer

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @CreateDateColumn()
  submittedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;
}
