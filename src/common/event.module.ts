import { Module } from '@nestjs/common';
import { EventEmitterPublisher } from './event-emitter.publisher';

@Module({
  providers: [EventEmitterPublisher],
  exports: [EventEmitterPublisher],
})
export class EventModule {}
