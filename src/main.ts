import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // RabbitMQ 마이크로서비스 설정
  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://mo:mo@localhost:5672'],
      queue: 'ml_crud_queue',
      queueOptions: {
        durable: false,
      },
    },
  });

  // // AUDIO_DATA_QUEUE에 대한 마이크로서비스 설정 추가
  // const audioDataMicroservice = app.connectMicroservice<MicroserviceOptions>({
  //   transport: Transport.RMQ,
  //   options: {
  //     urls: ['amqp://mo:mo@localhost:5672'],
  //     queue: 'audio_data_queue',
  //     queueOptions: {
  //       durable: false,
  //     },
  //   },
  // });
  
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions:{
      enableImplicitConversion: true
    }
  }))
  await app.startAllMicroservices(); // 마이크로서비스 
  await app.listen(3000);
  
}
bootstrap();
