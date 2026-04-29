import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetEntity, AssetStatus } from './asset.entity';
import { AuditService } from '../audit/audit.service';
import { EventEmitterPublisher } from '../common/event-emitter.publisher';

describe('AssetsService', () => {
  let service: AssetsService;
  let repository: Repository<AssetEntity>;
  let auditService: AuditService;
  let eventPublisher: EventEmitterPublisher;

  const mockAsset: Partial<AssetEntity> = {
    id: 'asset-1',
    name: 'Test Property',
    description: 'A test property for unit tests',
    propertyAddress: '123 Test St',
    jurisdiction: 'UAE',
    estimatedValue: 1000000,
    tokenizedAmount: 1000000,
    createdById: 'user-1',
    status: AssetStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((entity) => ({ ...mockAsset, ...entity })),
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
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
        AssetsService,
        { provide: getRepositoryToken(AssetEntity), useValue: mockRepository },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventEmitterPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    repository = module.get<Repository<AssetEntity>>(getRepositoryToken(AssetEntity));
    auditService = module.get<AuditService>(AuditService);
    eventPublisher = module.get<EventEmitterPublisher>(EventEmitterPublisher);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new asset', async () => {
      const createAssetDto = {
        name: 'New Property',
        description: 'A new property for testing',
        propertyAddress: '456 New St',
        jurisdiction: 'UAE',
        estimatedValue: 2000000,
        tokenizedAmount: 2000000,
        createdById: 'user-1',
      };

      const result = await service.create(createAssetDto as any);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
      expect(result.status).toBe(AssetStatus.DRAFT);
    });
  });

  describe('findAll', () => {
    it('should return paginated assets', async () => {
      const assets = [mockAsset, { ...mockAsset, id: 'asset-2' }];
      mockRepository.findAndCount.mockResolvedValue([assets, 2]);

      const result = await service.findAll();

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('findById', () => {
    it('should return asset by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockAsset);

      const result = await service.findById('asset-1');

      expect(result).toEqual(mockAsset);
    });

    it('should return null if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByStatus', () => {
    it('should return assets by status', async () => {
      const assets = [mockAsset];
      mockRepository.find.mockResolvedValue(assets);

      const result = await service.findByStatus(AssetStatus.DRAFT);

      expect(result).toHaveLength(1);
      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: AssetStatus.DRAFT } }),
      );
    });
  });

  describe('update', () => {
    it('should update asset', async () => {
      mockRepository.findOne.mockResolvedValue(mockAsset);

      const result = await service.update('asset-1', { name: 'Updated Name' });

      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'Updated' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve asset', async () => {
      mockRepository.findOne.mockResolvedValue(mockAsset);

      const result = await service.approve('asset-1', 'admin-1');

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AssetStatus.APPROVED,
          approvedBy: 'admin-1',
        }),
      );
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.approve('non-existent', 'admin-1'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should retire asset instead of hard deleting', async () => {
      mockRepository.findOne.mockResolvedValue(mockAsset);

      await service.remove('asset-1');

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AssetStatus.RETIRED }),
      );
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
