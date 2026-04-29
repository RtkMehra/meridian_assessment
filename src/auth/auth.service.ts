import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateUserDto, UserResponseDto } from '../users/dto';
import { LoginDto, AuthResponseDto, UserResponseData } from './dto';
import { UserEntity, UserStatus } from '../users/user.entity';
import { EncryptionService } from '../common/encryption.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/enums/audit-action.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create({
      ...createUserDto,
      role: undefined,
    });

    this.auditService.log({
      action: AuditAction.USER_CREATED,
      userId: user.id,
      resourceId: user.id,
      resourceType: 'user',
      sourceType: 'api',
      status: 'success',
    });

    return this.generateAuthResponse(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      this.auditService.log({
        action: AuditAction.AUTH_FAILURE,
        resourceType: 'user',
        sourceType: 'api',
        status: 'failure',
        errorMessage: 'User not found',
        metadata: JSON.stringify({ attemptedEmail: loginDto.email }),
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.encryptionService.comparePassword(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      this.auditService.log({
        action: AuditAction.AUTH_FAILURE,
        userId: user.id,
        resourceId: user.id,
        resourceType: 'user',
        sourceType: 'api',
        status: 'failure',
        errorMessage: 'Invalid password',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    await this.usersService.updateLastLogin(user.id);

    this.auditService.log({
      action: AuditAction.USER_LOGIN,
      userId: user.id,
      resourceId: user.id,
      resourceType: 'user',
      sourceType: 'api',
      status: 'success',
    });

    return this.generateAuthResponse(user);
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      this.jwtService.verify(token);
      return true;
    } catch {
      return false;
    }
  }

  private generateAuthResponse(user: UserEntity): AuthResponseDto {
    const payload = { sub: user.id, email: user.email, role: user.role, userId: user.userId };
    const expiresIn = process.env.JWT_EXPIRATION || '24h';

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: expiresIn as any }),
      expiresIn,
      user: this.mapUserResponse(user),
    };
  }

  private mapUserResponse(user: UserEntity): UserResponseData {
    return {
      id: user.id,
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      jurisdiction: user.jurisdiction,
      kycApproved: user.kycApproved,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  getHealth() {
    return {
      provider: 'JWT',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
