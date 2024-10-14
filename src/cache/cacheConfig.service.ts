import { CacheModuleOptions, CacheOptionsFactory } from "@nestjs/cache-manager";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { redisStore } from "cache-manager-redis-yet";
import { envVariableKeys } from "src/common/const/env.const";

@Injectable()
export class CacheConfigService implements CacheOptionsFactory {
    constructor(
        private readonly configService: ConfigService,
    ){}
    createCacheOptions(): CacheModuleOptions {
        const config: CacheModuleOptions = {
            store: redisStore,
            host: this.configService.get<string>(envVariableKeys.redishost),
            password: this.configService.get<string>(envVariableKeys.redispassword),
            port: this.configService.get<number>(envVariableKeys.redisport),
            ttl :60,
        };
        return config
    }
}