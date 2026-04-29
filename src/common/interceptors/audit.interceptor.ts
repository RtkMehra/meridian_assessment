import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../../audit/audit.service';
import { AUDIT_ACTION_KEY } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const auditConfig = this.reflector.get<{ action: string; resourceType?: string }>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    if (!auditConfig) {
      return next.handle();
    }

    const startTime = Date.now();
    const user = (request as any).user;
    const userId = user?.id;
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap({
        next: (data) => {
          const resourceId = data?.id || (request.params as any)?.id;
          const responseTime = Date.now() - startTime;

          this.auditService.log({
            action: auditConfig.action,
            userId,
            resourceId,
            resourceType: auditConfig.resourceType || 'unknown',
            sourceType: 'api',
            ipAddress,
            userAgent,
            status: 'success',
            metadata: JSON.stringify({
              method: request.method,
              url: request.url,
              responseTime,
            }),
          });
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;

          this.auditService.log({
            action: auditConfig.action,
            userId,
            resourceId: (request.params as any)?.id,
            resourceType: auditConfig.resourceType || 'unknown',
            sourceType: 'api',
            ipAddress,
            userAgent,
            status: 'failure',
            errorMessage: error.message,
            metadata: JSON.stringify({
              method: request.method,
              url: request.url,
              responseTime,
            }),
          });
        },
      }),
    );
  }
}
