import { Controller, Get, Post, Put, Delete, Body, Param, Req, Query, UseGuards, UseInterceptors, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { UserStatus, UserEntity } from './user.entity';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { AuditLog } from '../common/decorators/audit.decorator';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuthenticatedRequest, PaginationDto, PaginatedResult } from '../common/types';

const userResponseExample: UserResponseDto = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user-external-id-123',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.INVESTOR,
  status: 'ACTIVE',
  jurisdiction: 'UAE',
  kycApproved: false,
  createdAt: new Date('2026-04-29T00:00:00Z'),
  updatedAt: new Date('2026-04-29T00:00:00Z'),
};

const paginatedUsersExample = {
  data: [userResponseExample],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'List of users',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/UserResponseDto' } },
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
    example: paginatedUsersExample,
  })
  async findAll(@Query() pagination: PaginationDto): Promise<PaginatedResult<UserResponseDto>> {
    const result = await this.usersService.findAll(pagination);
    return {
      data: result.data.map(this.mapUserResponse),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto,
    example: userResponseExample,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    example: { statusCode: 404, message: 'User with ID <id> not found', error: 'Not Found' },
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
    example: { statusCode: 403, message: 'Insufficient permissions for this user', error: 'Forbidden' },
  })
  async findById(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    this.assertSelfOrPrivileged(request.user, id);
    return this.mapUserResponse(user);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @UseInterceptors(AuditInterceptor)
  @AuditLog(AuditAction.USER_CREATED, 'user')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created',
    type: UserResponseDto,
    example: userResponseExample,
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
    example: { statusCode: 409, message: 'User with this email already exists', error: 'Conflict' },
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto);
    return this.mapUserResponse(user);
  }

  @Put(':id')
  @UseInterceptors(AuditInterceptor)
  @AuditLog(AuditAction.USER_UPDATED, 'user')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User updated',
    type: UserResponseDto,
    example: userResponseExample,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    example: { statusCode: 404, message: 'User with ID <id> not found', error: 'Not Found' },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only admins can change roles',
    example: { statusCode: 403, message: 'Only admins can change user roles', error: 'Forbidden' },
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    this.assertSelfOrPrivileged(request.user, id);
    if (updateUserDto.role && request.user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can change user roles');
    }
    const user = await this.usersService.update(id, updateUserDto);
    return this.mapUserResponse(user);
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(AuditInterceptor)
  @AuditLog(AuditAction.USER_UPDATED, 'user')
  @ApiOperation({ summary: 'Update user status' })
  @ApiParam({ name: 'id', description: 'User ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_KYC'] } } } })
  @ApiResponse({
    status: 200,
    description: 'User status updated',
    type: UserResponseDto,
    example: { ...userResponseExample, status: 'SUSPENDED' },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    example: { statusCode: 404, message: 'User with ID <id> not found', error: 'Not Found' },
  })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateStatus(id, status);
    return this.mapUserResponse(user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(AuditInterceptor)
  @AuditLog(AuditAction.USER_DELETED, 'user')
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiParam({ name: 'id', description: 'User ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'User deleted (soft delete - status set to INACTIVE)',
    example: { message: 'User deleted successfully' },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    example: { statusCode: 404, message: 'User with ID <id> not found', error: 'Not Found' },
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }

  private assertSelfOrPrivileged(user: AuthenticatedRequest['user'], ownerId: string): void {
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const privilegedRoles = [UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER];
    if (user.id !== ownerId && !privilegedRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions for this user');
    }
  }

  private mapUserResponse(user: UserEntity): UserResponseDto {
    const { passwordHash, encryptedMetadata, ...rest } = user;
    return rest;
  }
}
