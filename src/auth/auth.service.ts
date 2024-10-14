import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role, User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt'
import { ConfigService } from '@nestjs/config';
import { number } from 'joi';
import { JwtService } from '@nestjs/jwt';

import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { envVariableKeys } from 'src/common/const/env.const';
import { raw } from 'express';
import { access } from 'fs';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userReposity: Repository<User>,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache
    ){}

    async tokenBlock(token: string){
      const payload = this.jwtService.decode(token);
      const expiryDate= +new Date(payload['exp']*1000);
      const now = +Date.now();


      const differenceInSeconds = (expiryDate - now) / 1000;
      await this.cacheManager.set(`BLOCK_TOKEN_${token}`, payload, Math.max(differenceInSeconds * 1000, 1));

      return true
  }


  // 베이직 토큰 받아서 아디, 비번 으로 분리함
  parseBasicToken(rawToken: string){
    const basicSplit = rawToken.split(' ');

    if(basicSplit.length !== 2){
      throw new BadRequestException('토큰 포멧이 잘못되었습니다!')
    }

    const [basic, token] = basicSplit;

    if(basic.toLowerCase() !== 'basic'){
      throw new BadRequestException('토큰 포멧이 잘못되었습니다!')
    }

    const decoded = Buffer.from(token, "base64").toString('utf-8')
    const tokenSplit = decoded.split(':');

    if(tokenSplit.length !== 2){
      throw new BadRequestException('토큰 포멧이 이상합니다!')
    }

    const [email, password] = tokenSplit;

    return {
      email,
      password,
    }
  }

  // bearerToken 인증 
  async parseBearerToken(rawToken: string, isRefreshToken: boolean){
    const basicSplit = rawToken.split(' ');

    if(basicSplit.length !== 2){
      throw new BadRequestException('토큰 포멧이 잘못되었습니다!')
    }

    const [bearer, token] = basicSplit;

    if(bearer.toLowerCase() !== 'bearer'){
      throw new BadRequestException('토큰 포멧이 잘못되었습니다!')
    }

    try{
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>(
          isRefreshToken ? envVariableKeys.refreshTokenSecret: envVariableKeys.accessTokenSecret,
        ),
      });

      if(isRefreshToken){
        if(payload.type !== 'refresh'){
          throw new BadRequestException('Refresh 토큰을 입력해주세요!')
        }
      }else{
        if(payload.type !== 'access'){
          throw new BadRequestException('Access 토큰을 입력해주세요!')
        }
      }

      return payload
    }catch(e){
      throw new UnauthorizedException('토큰이 만료되었습니다')
    }
  }

  // 유저 등록 // 캐싱 필여
  async register(rawToken: string){
    const {email, password} = this.parseBasicToken(rawToken)
    const user = await this.userReposity.findOne({
      where: {
        email,
      }
    });

    if(user){
      throw new BadRequestException('이미 가입한 이메일 입니다!')
    }

    const hash = await bcrypt.hash(password, this.configService.get<number>(envVariableKeys.hashRounds))

    await this.userReposity.save({
      email,
      password: hash,
    });

    return this.userReposity.findOne({
      where:{
        email,
      }
    })
  }
  

  // 캐싱 필요
  async authenticate(email: string, password: string){
    const user = await this.userReposity.findOne({
      where: {
        email,
      }
    });

    if(!user){
      throw new BadRequestException('잘못된 로그인 정보입니다!')
    }

    const passOk = await bcrypt.compare(password, user.password);

    if(!passOk){
      throw new BadRequestException('잘못된 로그인 정보입니다!')
    }

    return user;
  }
  
  async issueToken(user: {id: number, role: Role}, isRefreshToken: boolean){
    const refreshTokenSecret = this.configService.get<string>(envVariableKeys.refreshTokenSecret);
    const accessTokenSecret = this.configService.get<string>(envVariableKeys.accessTokenSecret)

    return await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      type: isRefreshToken ? 'refresh' : 'access',
    },{
      secret: isRefreshToken ? refreshTokenSecret : accessTokenSecret,
      expiresIn: isRefreshToken ? '24h' : 300
    })
  }

  async login(rawToken: string){
    const {email, password} = this.parseBasicToken(rawToken);

    const user = await this.authenticate(email, password)

    return {
      refreshToken: await this.issueToken(user, true),
      accessToken: await this.issueToken(user, false)
    }
  }
}
