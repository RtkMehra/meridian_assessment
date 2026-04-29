import { Controller, Get, Post, Put, Delete, Body, Param, Req, Query, UseGuards, UseInterceptors, NotFoundException, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto, UpdateAssetDto, AssetResponseDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AssetStatus, AssetEntity } from './asset.entity';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { AuditLog } from '../common/decorators/audit.decorator';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuthenticatedRequest, PaginationDto, PaginatedResult } from '../common/types';

const assetResponseExample: AssetResponseDto = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  name: 'Dubai Commercial Building',
  description: 'Premium office space in Downtown Dubai',
  propertyAddress: '123 Sheikh Zayed Road, Dubai, UAE',
  jurisdiction: 'UAE',
  estimatedValue: 5000000,
  tokenizedAmount: 5000000,
  createdById: '550e8400-e29b-41d4-a716-446655440000',
  status: AssetStatus.APPROVED,
  contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f5eE2B',
  createdAt: new Date('2026-04-28T00:00:00Z'),
  updatedAt: new Date('2026-04-29T00:00:00Z'),
};

const paginatedAssetsExample = {
  data: [assetResponseExample],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List all assets (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'List of assets',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/AssetResponseDto' } },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            total: { type: 'number', example: 1 },
            totalPages: { type: 'number', example: 1 },
          },
        },
      },
    },
    example: paginatedAssetsExample,
  })
  async findAll(@Query() pagination: PaginationDto): Promise<PaginatedResult<AssetResponseDto>> {
    const result = await this.assetsService.findAll(pagination);
    return {
      data: result.data.map(this.mapAssetResponse),
      meta: result.meta,
    };
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get assets by status' })
  @ApiParam({ name: 'status', enum: AssetStatus, example: AssetStatus.APPROVED })
  @ApiResponse({
    status: 200,
    description: 'List of assets with specified status',
    type: [AssetResponseDto],
    example: [assetResponseExample],
  })
  async findByStatus(@Param('status') status: AssetStatus): Promise<AssetResponseDto[]> {
    const assets = await this.assetsService.findByStatus(status);
    return assets.map(this.mapAssetResponse);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiParam({ name: 'id', description: 'Asset ID', example: '550e8400-e29b-41d4-a716-446655440002' })
  @ApiResponse({
    status: 200,
    description: 'Asset found',
    type: AssetResponseDto,
    example: assetResponseExample,
  })
  @ApiResponse({
    status: 404,
    description: 'Asset not found',
    example: { statusCode: 404, message: 'Asset with ID <id> not found', error: 'Not Found' },
  })
  async findById(@Param('id') id: string): Promise<AssetResponseDto> {
    const asset = await this.assetsService.findById(id);
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
    return this.mapAssetResponse(asset);
  }

  @Post()
  @Roles(UserRole.ASSET_MANAGER, UserRole.ADMIN)
  @UseInterceptors(AuditInterceptor)
  @AuditLog(AuditAction.ASSET_CREATED, 'asset')
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiBody({ type: CreateAssetDto })
  @ApiResponse({
    status: 201,
    description: 'Asset created',
    type: AssetResponseDto,
    example: { ...assetResponseExample, status: AssetStatus.DRAFT, contractAddress: null },
  })
  async create(@Body() createAssetDto: CreateAssetDto, @Req() request: AuthenticatedRequest): Promise<AssetResponseDto> {
    const asset = await this.assetsService.create({
      ...createAssetDto,
      createdById: request.user?.id,
    });
    return this.mapAssetResponse(asset);
  }

  @Put(':id')
  @Roles(UserRole.ASSET_MANAGER, UserRole.ADMIN)
  @UseInterceptors(AuditInterceptor)
  @AuditLog(AuditAction.ASSET_UPDATED, 'asset')
  @ApiOperation({ summary: 'Update asset' })
  @ApiParam({ name: 'id', description: 'Asset ID', example: '550e8400-e29b-41d4-a716-446655440002' })
  @ApiBody({ type: UpdateAssetDto })
  @ApiResponse({
    status: 200,
    description: 'Asset updated',
    type: AssetResponseDto,
    example: assetResponseExample,
  })
  @ApiResponse({
    status: 404,
    description: 'Asset not found',
    example: { statusCode: 404, message: 'Asset with ID <id> not found', error: 'Not Found' },
  })
  async update(
    @Param('id') id: string,
    @Body() updateAssetDto: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    const asset = await this.assetsService.update(id, updateAssetDto);
    return this.mapAssetResponse(asset);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
  @UseInterceptors(AuditInterceptor)
  @AuditLog(AuditAction.ASSET_APPROVED, 'asset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve asset for tokenization' })
  @ApiParam({ name: 'id', description: 'Asset ID', example: '550e8400-e29b-41d4-a716-446655440002' })
  @ApiResponse({
    status: 200,
    description: 'Asset approved',
    type: AssetResponseDto,
    example: { ...assetResponseExample, status: AssetStatus.APPROVED },
  })
  @ApiResponse({
    status: 404,
    description: 'Asset not found',
    example: { statusCode: 404, message: 'Asset with ID <id> not found', error: 'Not Found' },
  })
  async approve(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<AssetResponseDto> {
    if (!request.user) {
      throw new Error('Authenticated user required');
    }
    const asset = await this.assetsService.approve(id, request.user.id);
    return this.mapAssetResponse(asset);
  }

  @Delete(':id')
  @Roles(UserRole.ASSET_MANAGER, UserRole.ADMIN)
  @UseInterceptors(AuditInterceptor)
  @AuditLog(AuditAction.ASSET_DELETED, 'asset')
  @ApiOperation({ summary: 'Delete asset (soft delete - status set to RETIRED)' })
  @ApiParam({ name: 'id', description: 'Asset ID', example: '550e8400-e29b-41d4-a716-446655440002' })
  @ApiResponse({
    status: 200,
    description: 'Asset deleted (soft delete - status set to RETIRED)',
    example: { message: 'Asset deleted successfully' },
  })
  @ApiResponse({
    status: 404,
    description: 'Asset not found',
    example: { statusCode: 404, message: 'Asset with ID <id> not found', error: 'Not Found' },
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.assetsService.remove(id);
  }

  private mapAssetResponse(asset: AssetEntity): AssetResponseDto {
    const { encryptedMetadata, encryptedDocumentReferences, approvedBy, ...rest } = asset;
    return rest;
  }
}
