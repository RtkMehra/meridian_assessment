import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetEntity, AssetStatus } from './asset.entity';
import { CreateAssetDto, UpdateAssetDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { PaginationDto, PaginatedResult } from '../common/types';
import { EventEmitterPublisher } from '../common/event-emitter.publisher';
import { AppEvent } from '../common/events.types';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(AssetEntity)
    private readonly assetsRepository: Repository<AssetEntity>,
    private readonly auditService: AuditService,
    private readonly eventPublisher: EventEmitterPublisher,
  ) {}

  async create(createAssetDto: CreateAssetDto): Promise<AssetEntity> {
    const asset = this.assetsRepository.create({
      ...createAssetDto,
      status: AssetStatus.DRAFT,
    });

    const saved = await this.assetsRepository.save(asset);

    this.auditService.log({
      action: AuditAction.ASSET_CREATED,
      userId: createAssetDto.createdById,
      resourceId: saved.id,
      resourceType: 'asset',
      sourceType: 'api',
      status: 'success',
    });

    await this.eventPublisher.publish({
      event: AppEvent.ASSET_CREATED,
      timestamp: new Date().toISOString(),
      payload: { assetId: saved.id, name: saved.name, createdById: saved.createdById },
      correlationId: `asset-create-${saved.id}`,
    });

    return saved;
  }

  async findAll(pagination?: PaginationDto): Promise<PaginatedResult<AssetEntity>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const [data, total] = await this.assetsRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<AssetEntity | null> {
    return this.assetsRepository.findOne({ where: { id } });
  }

  async findByStatus(status: AssetStatus): Promise<AssetEntity[]> {
    return this.assetsRepository.find({ where: { status }, order: { createdAt: 'DESC' } });
  }

  async update(id: string, updateAssetDto: UpdateAssetDto): Promise<AssetEntity> {
    const asset = await this.findById(id);
    if (!asset) throw new NotFoundException(`Asset with ID ${id} not found`);

    Object.assign(asset, updateAssetDto);
    const saved = await this.assetsRepository.save(asset);

    await this.eventPublisher.publish({
      event: AppEvent.ASSET_UPDATED,
      timestamp: new Date().toISOString(),
      payload: { assetId: saved.id, changes: updateAssetDto },
      correlationId: `asset-update-${saved.id}`,
    });

    return saved;
  }

  async approve(id: string, approvedBy: string): Promise<AssetEntity> {
    const asset = await this.findById(id);
    if (!asset) throw new NotFoundException(`Asset with ID ${id} not found`);

    asset.status = AssetStatus.APPROVED;
    asset.approvedAt = new Date();
    asset.approvedBy = approvedBy;

    const saved = await this.assetsRepository.save(asset);

    this.auditService.log({
      action: AuditAction.ASSET_APPROVED,
      userId: approvedBy,
      resourceId: id,
      resourceType: 'asset',
      sourceType: 'api',
      status: 'success',
    });

    await this.eventPublisher.publish({
      event: AppEvent.ASSET_APPROVED,
      timestamp: new Date().toISOString(),
      payload: { assetId: saved.id, approvedBy, name: saved.name },
      correlationId: `asset-approve-${saved.id}`,
    });

    return saved;
  }

  async remove(id: string): Promise<void> {
    const asset = await this.findById(id);
    if (!asset) throw new NotFoundException(`Asset with ID ${id} not found`);

    asset.status = AssetStatus.RETIRED;
    await this.assetsRepository.save(asset);

    await this.eventPublisher.publish({
      event: AppEvent.ASSET_DELETED,
      timestamp: new Date().toISOString(),
      payload: { assetId: id, retiredAt: new Date().toISOString() },
      correlationId: `asset-delete-${id}`,
    });
  }
}
