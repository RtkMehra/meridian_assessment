import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EncryptionService } from '../common/encryption.service';
import { AuditService } from '../audit/audit.service';
import { UserRole, UserStatus } from '../users/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let encryptionService: EncryptionService;
  let auditService: AuditService;

  const mockUser = {
    id: 'user-1',
    userId: 'ext-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.INVESTOR,
    status: UserStatus.ACTIVE,
    jurisdiction: 'UAE',
    kycApproved: false,
    passwordHash: '$2b$10$hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockEncryptionService = {
    hashPassword: jest.fn().mockResolvedValue('$2b$10$hashed'),
    comparePassword: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue({}),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const createUserDto = {
        userId: 'ext-1',
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.ADMIN,
      };

      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.register(createUserDto as any);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(mockUser.email);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: undefined }),
      );
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should throw ConflictException if user exists', async () => {
      const createUserDto = {
        userId: 'ext-1',
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      mockUsersService.create.mockRejectedValue(new ConflictException('User already exists'));

      await expect(service.register(createUserDto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockEncryptionService.comparePassword.mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe(mockUser.email);
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login({ email: 'none@example.com', password: 'pass' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockEncryptionService.comparePassword.mockResolvedValue(false);

      await expect(service.login({ email: 'test@example.com', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for suspended user', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      mockUsersService.findByEmail.mockResolvedValue(suspendedUser);
      mockEncryptionService.comparePassword.mockResolvedValue(true);

      await expect(service.login({ email: 'test@example.com', password: 'pass' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      const result = await service.validateToken('valid-token');

      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.validateToken('invalid-token');

      expect(result).toBe(false);
    });
  });
});
