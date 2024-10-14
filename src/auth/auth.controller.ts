import { Controller, Post, Headers, UseGuards, Request, Get, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LocalAuthGuard } from './strategy/local.strategy';
import { JwtAuthGuard } from './strategy/jwt.strategy';
import { access } from 'fs';
import { Public } from './decorator/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  registerUser(@Headers('authorization') token: string){
    return this.authService.register(token);
  }

  @Public()
  @Post('login')
  loginUser(@Headers('authorization') token: string){
    return this.authService.login(token)
  }

  @Post('token/block')
  blockToken(
    @Body('token') token: string,
  ){
    return this.authService.tokenBlock(token);
  }
  // refresh Token으로 access Token 토큰 재발급
  @Post('token/access')
  async rotationAccessToken(@Request() req){
    return {
      accessToken: await this.authService.issueToken(req.user, false),
    }
  }
  
  @UseGuards(LocalAuthGuard)
  @Post('login/passport')
  async loginUserPassport(@Request() req){
    return {
      refreshToken: await this.authService.issueToken(req.user, true),
      accessToken: await this.authService.issueToken(req.user, false),
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('private')
  async private(@Request() req){
    return req.user
  }
}
