import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, AuthResponseDto } from './dto';
import { CreateUserDto } from '../users/dto';

const authResponseExample: AuthResponseDto = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  expiresIn: '24h',
  user: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: 'user-external-id-123',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'investor',
    status: 'ACTIVE',
    jurisdiction: 'UAE',
    kycApproved: false,
    createdAt: new Date('2026-04-29T00:00:00Z'),
    updatedAt: new Date('2026-04-29T00:00:00Z'),
  },
};

const errorResponseExample = {
  statusCode: 401,
  message: 'Invalid credentials',
  error: 'Unauthorized',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
    example: authResponseExample,
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
    example: { statusCode: 409, message: 'User with this email already exists', error: 'Conflict' },
  })
  async register(@Body() createUserDto: CreateUserDto): Promise<AuthResponseDto> {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
    example: authResponseExample,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    example: errorResponseExample,
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check auth service health' })
  @ApiResponse({
    status: 200,
    description: 'Auth service is healthy',
    example: { provider: 'JWT', status: 'healthy', timestamp: '2026-04-29T22:00:00.000Z' },
  })
  health() {
    return this.authService.getHealth();
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check auth provider status' })
  @ApiResponse({
    status: 200,
    description: 'Auth provider status',
    example: { provider: 'JWT', available: true },
  })
  status() {
    return { provider: 'JWT', available: true };
  }
}
