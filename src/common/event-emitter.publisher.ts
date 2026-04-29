import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
import { AppEvent, DomainEvent, EventPublisher } from './events.types';

@Injectable()
export class EventEmitterPublisher implements EventPublisher, OnModuleDestroy {
  private readonly emitter = new EventEmitter();
  private readonly logger = new Logger(EventEmitterPublisher.name);
  private readonly queue: DomainEvent[] = [];
  private processing = false;

  async publish(event: DomainEvent): Promise<void> {
    this.queue.push(event);
    this.processQueue();
  }

  on(event: AppEvent, handler: (event: DomainEvent) => void): void {
    this.emitter.on(event, handler);
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift()!;
      try {
        this.emitter.emit(event.event, event);
        this.logger.debug(`Event published: ${event.event} [${event.correlationId}]`);
      } catch (error) {
        this.logger.error(`Failed to process event ${event.event}: ${error}`);
      }
    }

    this.processing = false;
  }

  onModuleDestroy(): void {
    this.emitter.removeAllListeners();
  }
}
