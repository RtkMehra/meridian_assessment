import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycEntity, KycStatus } from './kyc.entity';
import { CreateKycDto, UpdateKycDto } from './dto';
import { EncryptionService } from '../common/encryption.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { PaginationDto, PaginatedResult } from '../common/types';
import { EventEmitterPublisher } from '../common/event-emitter.publisher';
import { AppEvent } from '../common/events.types';

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(KycEntity)
    private readonly kycRepository: Repository<KycEntity>,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
    private readonly eventPublisher: EventEmitterPublisher,
  ) {}

  async create(createKycDto: CreateKycDto): Promise<KycEntity> {
    const encryptedDocData = this.encryptionService.encrypt(
      JSON.stringify({
        documentType: createKycDto.documentType,
        documentUri: createKycDto.documentUri,
      }),
    );

    const kyc = this.kycRepository.create({
      userId: createKycDto.userId,
      encryptedDocumentData: encryptedDocData,
      jurisdiction: createKycDto.jurisdiction,
      status: KycStatus.PENDING,
    });

    const saved = await this.kycRepository.save(kyc);

    this.auditService.log({
      action: AuditAction.KYC_SUBMITTED,
      userId: createKycDto.userId,
      resourceId: saved.id,
      resourceType: 'kyc',
      sourceType: 'api',
      status: 'success',
    });

    await this.eventPublisher.publish({
      event: AppEvent.KYC_SUBMITTED,
      timestamp: new Date().toISOString(),
      payload: { kycId: saved.id, userId: createKycDto.userId, jurisdiction: createKycDto.jurisdiction },
      correlationId: `kyc-submit-${saved.id}`,
    });

    return saved;
  }

  async findAll(pagination?: PaginationDto): Promise<PaginatedResult<KycEntity>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const [data, total] = await this.kycRepository.findAndCount({
      order: { submittedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<KycEntity | null> {
    return this.kycRepository.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<KycEntity[]> {
    return this.kycRepository.find({
      where: { userId },
      order: { submittedAt: 'DESC' },
    });
  }

  async update(id: string, updateKycDto: UpdateKycDto): Promise<KycEntity> {
    const kyc = await this.findById(id);
    if (!kyc) {
      throw new NotFoundException(`KYC record with ID ${id} not found`);
    }

    if (updateKycDto.status === KycStatus.APPROVED) {
      kyc.approvedAt = new Date();
      kyc.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      this.auditService.log({
        action: AuditAction.KYC_APPROVED,
        userId: updateKycDto.reviewedBy,
        resourceId: id,
        resourceType: 'kyc',
        sourceType: 'api',
        status: 'success',
      });

      await this.eventPublisher.publish({
        event: AppEvent.KYC_APPROVED,
        timestamp: new Date().toISOString(),
        payload: { kycId: id, userId: kyc.userId, approvedBy: updateKycDto.reviewedBy },
        correlationId: `kyc-approve-${id}`,
      });
    }

    if (updateKycDto.status === KycStatus.REJECTED) {
      this.auditService.log({
        action: AuditAction.KYC_REJECTED,
        userId: updateKycDto.reviewedBy,
        resourceId: id,
        resourceType: 'kyc',
        sourceType: 'api',
        status: 'success',
        metadata: JSON.stringify({ reason: updateKycDto.rejectionReason }),
      });

      await this.eventPublisher.publish({
        event: AppEvent.KYC_REJECTED,
        timestamp: new Date().toISOString(),
        payload: { kycId: id, userId: kyc.userId, rejectedBy: updateKycDto.reviewedBy },
        correlationId: `kyc-reject-${id}`,
      });
    }

    Object.assign(kyc, updateKycDto);
    return this.kycRepository.save(kyc);
  }

  async getPendingCount(): Promise<number> {
    return this.kycRepository.count({ where: { status: KycStatus.PENDING } });
  }

  async softDelete(id: string): Promise<void> {
    const kyc = await this.findById(id);
    if (!kyc) {
      throw new NotFoundException(`KYC record with ID ${id} not found`);
    }

    kyc.status = KycStatus.EXPIRED;
    await this.kycRepository.save(kyc);
  }
}
