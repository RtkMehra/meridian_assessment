import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { KycEntity } from '../kyc/kyc.entity';
import { AssetEntity } from '../assets/asset.entity';

export { UserRole, UserStatus };

@Entity('users')
@Index(['email'], { unique: true })
@Index(['userId'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  userId: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'text' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 255 })
  firstName: string;

  @Column({ type: 'varchar', length: 255 })
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.INVESTOR,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  jurisdiction: string;

  @Column({ type: 'boolean', default: false })
  kycApproved: boolean;

  @Column({ type: 'text', nullable: true })
  encryptedMetadata: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @OneToMany(() => KycEntity, (kyc) => kyc.user)
  kycRecords: KycEntity[];

  @OneToMany(() => AssetEntity, (asset) => asset.createdBy)
  createdAssets: AssetEntity[];
}
