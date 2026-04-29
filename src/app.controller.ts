import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    example: {
      status: 'ok',
      uptime: 12345.67,
      timestamp: new Date().toISOString(),
    },
  })
  health() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'API info' })
  @ApiResponse({
    status: 200,
    description: 'API service information',
    example: {
      service: 'MeridianSquare Backend',
      version: '0.1.0',
      docs: '/api/docs',
      health: '/api/v1/health',
    },
  })
  root() {
    return {
      service: 'MeridianSquare Backend',
      version: '0.1.0',
    };
  }
}
