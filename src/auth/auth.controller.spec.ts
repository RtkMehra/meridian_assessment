import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let authService: any;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    getHealth: jest.fn(),
    validateToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-secret-key-for-integration-tests-min-32',
          signOptions: { expiresIn: '24h' },
        }),
      ],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        userId: 'ext-1',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = {
        accessToken: 'token',
        expiresIn: '24h',
        user: { id: '1', email: 'test@example.com' },
      };

      mockAuthService.register.mockResolvedValue(response);

      await supertest(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('should return 400 for invalid email', async () => {
      await supertest(app.getHttpServer())
        .post('/auth/register')
        .send({
          userId: 'ext-1',
          email: 'invalid-email',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });

    it('should return 400 for short password', async () => {
      await supertest(app.getHttpServer())
        .post('/auth/register')
        .send({
          userId: 'ext-1',
          email: 'test@example.com',
          password: 'short',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const response = {
        accessToken: 'token',
        expiresIn: '24h',
        user: { id: '1', email: 'test@example.com' },
      };

      mockAuthService.login.mockResolvedValue(response);

      await supertest(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('accessToken');
        });
    });

    it('should return 400 for missing fields', async () => {
      await supertest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);
    });
  });

  describe('GET /auth/health', () => {
    it('should return health status', async () => {
      mockAuthService.getHealth.mockReturnValue({
        provider: 'JWT',
        status: 'ok',
        timestamp: new Date().toISOString(),
      });

      await supertest(app.getHttpServer())
        .get('/auth/health')
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('status', 'ok');
        });
    });
  });
});
