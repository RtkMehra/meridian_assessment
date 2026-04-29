import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../enums/audit-action.enum';

export const AUDIT_ACTION_KEY = 'auditAction';
export const AuditLog = (action: AuditAction, resourceType?: string) =>
  SetMetadata(AUDIT_ACTION_KEY, { action, resourceType });
