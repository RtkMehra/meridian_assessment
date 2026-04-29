import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserEntity } from './user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { EncryptionService } from '../common/encryption.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<UserEntity>;

  const mockUser: Partial<UserEntity> = {
    id: 'user-1',
    userId: 'ext-1',
    email: 'test@example.com',
    passwordHash: 'hashed',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.INVESTOR,
    status: UserStatus.ACTIVE,
    jurisdiction: 'UAE',
    kycApproved: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((entity) => ({ ...mockUser, ...entity })),
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockEncryptionService = {
    hashPassword: jest.fn().mockResolvedValue('hashed'),
    comparePassword: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepository },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        userId: 'ext-1',
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.create(createUserDto as any);

      expect(mockEncryptionService.hashPassword).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.role).toBe(UserRole.INVESTOR);
    });

    it('should throw ConflictException if email exists', async () => {
      const createUserDto = {
        userId: 'ext-1',
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto as any))
        .rejects.toThrow('User with this email already exists');
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-2' }];
      mockRepository.findAndCount.mockResolvedValue([users, 2]);

      const result = await service.findAll();

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });
  });

  describe('updateStatus', () => {
    it('should update user status', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.updateStatus('user-1', UserStatus.SUSPENDED);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.SUSPENDED }),
      );
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.updateStatus('non-existent', UserStatus.SUSPENDED))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete user by setting status to INACTIVE', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      await service.remove('user-1');

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.INACTIVE }),
      );
    });
  });
});
