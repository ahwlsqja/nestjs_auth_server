import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CommonModule } from './common/common.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi'
import { TypeOrmModule } from '@nestjs/typeorm';
import { envVariableKeys } from './common/const/env.const';
import { User } from './user/entities/user.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { join } from 'path';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ModelsModule } from './models/models.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './auth/guard/auth.guard'
import { RBACGuard } from './auth/guard/rbac.guard';
import { ResponseTimeInterceptor } from './common/interceptor/response.time.interceptor';
import { BearerTokenMiddleware } from './auth/middleware/bearer-token.middleware';
import * as redisStore from 'cache-manager-redis-store'
import { CacheConfigService } from './cache/cacheConfig.service';
import { S3Module } from './s3/s3.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        ENV: Joi.string().valid('dev', 'prod').required(),
        DB_TYPE:Joi.string().valid('postgres').required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_DATABASE: Joi.string().required(),
        HASH_ROUNDS:Joi.number().required(),
        ACCESS_TOKEN_SECRET: Joi.string().required(),
        REFRESH_TOKEN_SECRET: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      useFactory:(configService:ConfigService) => ({
        type: configService.get<string>(envVariableKeys.dbType) as "postgres",
        host: configService.get<string>(envVariableKeys.dbHost),
        port: configService.get<number>(envVariableKeys.dbPort),
        username: configService.get<string>(envVariableKeys.dbUsername),
        password: configService.get<string>(envVariableKeys.dbPassword),
        database: configService.get<string>(envVariableKeys.dbDatabase),
        entities: [
          User,
        ],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
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
    CacheModule.registerAsync({
      isGlobal: true,
      useClass: CacheConfigService,
    }),
    WinstonModule.forRoot({
      level: 'debug',
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            // winston.format.colorize({
            //   all: true,
            // }),
            winston.format.timestamp(),
            winston.format.printf(info => `${info.timestamp} ${info.context} ${info.level} ${info.message}`)
          ),
        }),
        new winston.transports.File({
          dirname: join(process.cwd(), 'logs'),
          filename: 'logs.log',
          format: winston.format.combine(
            // winston.format.colorize({
            //   all: true,
            // }),
            winston.format.timestamp(),
            winston.format.printf(info => `${info.timestamp} ${info.context} ${info.level} ${info.message}`)
          ),
        })
      ]
    }),
    AuthModule, 
    UserModule, 
    CommonModule, ModelsModule, S3Module
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RBACGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTimeInterceptor,
    },
  ],
})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(
      BearerTokenMiddleware
    ).exclude({
      path: 'auth/login',
      method: RequestMethod.POST,
    }, {
      path: 'auth/register',
      method: RequestMethod.POST,
    })
    .forRoutes('*')
  }
}
