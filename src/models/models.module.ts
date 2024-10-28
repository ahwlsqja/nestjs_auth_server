import { Module } from '@nestjs/common';
import { ModelsService } from './models.service';
import { ModelsController } from './models.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { S3Module } from 'src/s3/s3.module';

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
      {
        name: 'AUDIO_DATA_QUEUE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://mo:mo@localhost:5672'],
          queue: 'audio_data_queue',
          queueOptions: {
            durable :false,
          }
        }
      },
    ]),
    S3Module,
  ],
  controllers: [ModelsController],
  providers: [ModelsService],
})
export class ModelsModule {}
