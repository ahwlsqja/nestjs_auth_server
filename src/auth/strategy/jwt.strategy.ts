import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard, PassportStrategy } from "@nestjs/passport";
import { ExtractJwt } from "passport-jwt";
import { Strategy } from "passport-jwt";

export class JwtAuthGuard extends AuthGuard('jwt'){}
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
    ){
        // super는 PassportStrategy의 생성자 호출함. 즉 부모 클래스의 생성자 호출하는게 super임
        super({
            /// Bearer $token
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('ACCESS_TOKEN_SECRET'),
        })
    }

    validate(payload: any){
        return payload;
    }
}