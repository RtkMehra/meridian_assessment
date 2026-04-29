import { Controller, Get, Post, Put, Body, Param, Req, Query, UseGuards, UseInterceptors, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { CreateKycDto, UpdateKycDto, KycResponseDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { KycStatus, KycEntity } from './kyc.entity';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { AuditLog } from '../common/decorators/audit.decorator';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuthenticatedRequest, PaginationDto, PaginatedResult } from '../common/types';

const kycResponseExample: KycResponseDto = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  userId: '550e8400-e29b-41d4-a716-446655440000',
  status: KycStatus.APPROVED,
  jurisdiction: 'UAE',
  amlFlagged: false,
  submittedAt: new Date('2026-04-28T00:00:00Z'),
  updatedAt: new Date('2026-04-29T00:00:00Z'),
  approvedAt: new Date('2026-04-29T12:00:00Z'),
  expiresAt: new Date('2027-04-29T12:00:00Z'),
};

const paginatedKycExample = {
  data: [kycResponseExample],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

@ApiTags('kyc')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.KYC_REVIEWER, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'List all KYC records (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'List of KYC records',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/KycResponseDto' } },
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
    example: paginatedKycExample,
  })
  async findAll(@Query() pagination: PaginationDto): Promise<PaginatedResult<KycResponseDto>> {
    const result = await this.kycService.findAll(pagination);
    return {
      data: result.data.map(this.mapKycResponse),
      meta: result.meta,
    };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get KYC records for a user' })
  @ApiParam({ name: 'userId', description: 'User ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'List of KYC records for user',
    type: [KycResponseDto],
    example: [kycResponseExample],
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
    example: { statusCode: 403, message: 'Insufficient permissions for this KYC record', error: 'Forbidden' },
  })
  async findByUserId(@Param('userId') userId: string, @Req() request: AuthenticatedRequest): Promise<KycResponseDto[]> {
    this.assertSelfOrPrivileged(request.user, userId);
    const records = await this.kycService.findByUserId(userId);
    return records.map(this.mapKycResponse);
  }

  @Get('status')
  @Roles(UserRole.ADMIN, UserRole.KYC_REVIEWER, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Get KYC statuses' })
  @ApiResponse({
    status: 200,
    description: 'List of KYC records with their statuses',
    type: [KycResponseDto],
    example: [kycResponseExample],
  })
  async getStatuses(): Promise<KycResponseDto[]> {
    const records = await this.kycService.findAll();
    return records.data.map(this.mapKycResponse);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get KYC record by ID' })
  @ApiParam({ name: 'id', description: 'KYC record ID', example: '550e8400-e29b-41d4-a716-446655440001' })
  @ApiResponse({
    status: 200,
    description: 'KYC record found',
    type: KycResponseDto,
    example: kycResponseExample,
  })
  @ApiResponse({
    status: 404,
    description: 'KYC record not found',
    example: { statusCode: 404, message: 'KYC record with ID <id> not found', error: 'Not Found' },
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
    example: { statusCode: 403, message: 'Insufficient permissions for this KYC record', error: 'Forbidden' },
  })
  async findById(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<KycResponseDto> {
    const record = await this.kycService.findById(id);
    if (!record) {
      throw new NotFoundException(`KYC record with ID ${id} not found`);
    }
    this.assertSelfOrPrivileged(request.user, record.userId);
    return this.mapKycResponse(record);
  }

  @Post()
  @UseInterceptors(AuditInterceptor)
  @AuditLog(AuditAction.KYC_SUBMITTED, 'kyc')
  @ApiOperation({ summary: 'Submit KYC verification' })
  @ApiBody({ type: CreateKycDto })
  @ApiResponse({
    status: 201,
    description: 'KYC submission received',
    type: KycResponseDto,
    example: { ...kycResponseExample, status: KycStatus.PENDING, approvedAt: null, expiresAt: null },
  })
  async create(@Body() createKycDto: CreateKycDto, @Req() request: AuthenticatedRequest): Promise<KycResponseDto> {
    if (!request.user) {
      throw new Error('Authentication required');
    }
    const record = await this.kycService.create({ ...createKycDto, userId: request.user.id });
    return this.mapKycResponse(record);
  }

  @Put(':id')
  @Roles(UserRole.KYC_REVIEWER, UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
  @UseInterceptors(AuditInterceptor)
  @AuditLog(AuditAction.KYC_APPROVED, 'kyc')
  @ApiOperation({ summary: 'Update KYC record (approve/reject)' })
  @ApiParam({ name: 'id', description: 'KYC record ID', example: '550e8400-e29b-41d4-a716-446655440001' })
  @ApiBody({ type: UpdateKycDto })
  @ApiResponse({
    status: 200,
    description: 'KYC record updated',
    type: KycResponseDto,
    example: kycResponseExample,
  })
  @ApiResponse({
    status: 404,
    description: 'KYC record not found',
    example: { statusCode: 404, message: 'KYC record with ID <id> not found', error: 'Not Found' },
  })
  async update(
    @Param('id') id: string,
    @Body() updateKycDto: UpdateKycDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<KycResponseDto> {
    if (!request.user) {
      throw new Error('Authentication required');
    }
    const record = await this.kycService.update(id, {
      ...updateKycDto,
      reviewedBy: request.user.id,
    });
    return this.mapKycResponse(record);
  }

  private assertSelfOrPrivileged(user: AuthenticatedRequest['user'], ownerId: string): void {
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const privilegedRoles = [UserRole.ADMIN, UserRole.KYC_REVIEWER, UserRole.COMPLIANCE_OFFICER];
    if (user.id !== ownerId && !privilegedRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions for this KYC record');
    }
  }

  private mapKycResponse(kyc: KycEntity): KycResponseDto {
    const { encryptedDocumentData, providerReference, amlFlagReason, rejectionReason, reviewedBy, ...rest } = kyc;
    return rest;
  }
}
