import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEntity } from './audit.entity';
import { EncryptionService } from '../common/encryption.service';

interface AuditLogInput {
  action: string;
  userId?: string;
  resourceId?: string;
  resourceType?: string;
  sourceType?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: string;
  errorMessage?: string;
  metadata?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditRepository: Repository<AuditEntity>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async log(input: AuditLogInput): Promise<AuditEntity> {
    const recordData = JSON.stringify(input);
    const contentHash = this.encryptionService.hashForAudit(recordData);

    const auditEntry = this.auditRepository.create({
      action: input.action,
      userId: input.userId,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      sourceType: input.sourceType || 'api',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: input.status || 'success',
      errorMessage: input.errorMessage,
      metadata: input.metadata,
      contentHash,
    });

    return this.auditRepository.save(auditEntry);
  }

  async findAll(): Promise<AuditEntity[]> {
    return this.auditRepository.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findByUserId(userId: string): Promise<AuditEntity[]> {
    return this.auditRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findByResourceId(resourceId: string): Promise<AuditEntity[]> {
    return this.auditRepository.find({
      where: { resourceId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByAction(action: string): Promise<AuditEntity[]> {
    return this.auditRepository.find({
      where: { action },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  record(event: Record<string, unknown>) {
    return this.log({
      action: event.action as string,
      userId: event.userId as string,
      resourceId: event.resourceId as string,
      resourceType: event.resourceType as string,
      sourceType: 'api',
      status: 'success',
    });
  }

  getRecords() {
    return this.findAll();
  }
}
