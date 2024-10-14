import { Module } from '@nestjs/common';
import { ModelsService } from './models.service';
import { ModelsController } from './models.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ML_CRUD_QUEUE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://mo:mo@localhost:5672'],
          queue: 'ml_crud_queue',
          queueOptions:{
            durable: false,
          },
        },
      },
    ]),
  ],
  controllers: [ModelsController],
  providers: [ModelsService],
})
export class ModelsModule {}
