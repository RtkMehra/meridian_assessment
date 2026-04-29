export enum AppEvent {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  KYC_SUBMITTED = 'kyc.submitted',
  KYC_APPROVED = 'kyc.approved',
  KYC_REJECTED = 'kyc.rejected',
  ASSET_CREATED = 'asset.created',
  ASSET_UPDATED = 'asset.updated',
  ASSET_APPROVED = 'asset.approved',
  ASSET_DELETED = 'asset.deleted',
  TOKEN_MINTED = 'token.minted',
  TOKEN_TRANSFERRED = 'token.transferred',
}

export interface DomainEvent {
  event: AppEvent;
  timestamp: string;
  payload: Record<string, unknown>;
  correlationId: string;
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  on(event: AppEvent, handler: (event: DomainEvent) => void): void;
}
