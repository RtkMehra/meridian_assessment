import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycEntity, KycStatus } from './kyc.entity';
import { EncryptionService } from '../common/encryption.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitterPublisher } from '../common/event-emitter.publisher';

describe('KycService', () => {
  let service: KycService;
  let repository: Repository<KycEntity>;
  let encryptionService: EncryptionService;
  let auditService: AuditService;
  let eventPublisher: EventEmitterPublisher;

  const mockKyc: Partial<KycEntity> = {
    id: 'kyc-1',
    userId: 'user-1',
    status: KycStatus.PENDING,
    encryptedDocumentData: 'encrypted:data:here',
    jurisdiction: 'UAE',
    amlFlagged: false,
    submittedAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((entity) => ({ ...mockKyc, ...entity })),
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  };

  const mockEncryptionService = {
    encrypt: jest.fn().mockReturnValue('encrypted:data:here'),
    decrypt: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue({}),
  };

  const mockEventPublisher = {
    publish: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: getRepositoryToken(KycEntity), useValue: mockRepository },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventEmitterPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    repository = module.get<Repository<KycEntity>>(getRepositoryToken(KycEntity));
    encryptionService = module.get<EncryptionService>(EncryptionService);
    auditService = module.get<AuditService>(AuditService);
    eventPublisher = module.get<EventEmitterPublisher>(EventEmitterPublisher);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new KYC record', async () => {
      const createKycDto = {
        userId: 'user-1',
        documentType: 'passport',
        documentUri: 's3://bucket/doc.pdf',
        jurisdiction: 'UAE',
      };

      const result = await service.create(createKycDto as any);

      expect(encryptionService.encrypt).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated KYC records', async () => {
      const records = [mockKyc, { ...mockKyc, id: 'kyc-2' }];
      mockRepository.findAndCount.mockResolvedValue([records, 2]);

      const result = await service.findAll();

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('findById', () => {
    it('should return KYC record by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockKyc);

      const result = await service.findById('kyc-1');

      expect(result).toEqual(mockKyc);
    });

    it('should return null if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return KYC records for user', async () => {
      const records = [mockKyc];
      mockRepository.find.mockResolvedValue(records);

      const result = await service.findByUserId('user-1');

      expect(result).toHaveLength(1);
      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('update', () => {
    it('should update KYC record', async () => {
      mockRepository.findOne.mockResolvedValue(mockKyc);

      const result = await service.update('kyc-1', { status: KycStatus.APPROVED });

      expect(mockRepository.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { status: KycStatus.APPROVED }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending KYC records', async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await service.getPendingCount();

      expect(result).toBe(5);
    });
  });
});
