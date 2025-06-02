import { ExtractJwt, Strategy, JwtFromRequestFunction } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import config from '../../config/config';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { User } from '../../users/entities/user.entity';
import { Request } from 'express';

export type JwtPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    @InjectRepository(User) private userRepository: EntityRepository<User>
  ) {
    const jwtSecret = configService.jwt?.secret;

    if (!jwtSecret) {
      throw new Error('JWT secret is not defined in configuration.');
    }

    // Support both cookie and Authorization header
    const cookieAndAuthHeaderExtractor: JwtFromRequestFunction = (
      req: Request
    ) => {
      return (
        req?.cookies?.['access_token'] ||
        ExtractJwt.fromAuthHeaderAsBearerToken()(req)
      );
    };

    super({
      jwtFromRequest: cookieAndAuthHeaderExtractor,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findOne({ id: payload.sub });

    if (!user) {
      throw new UnauthorizedException('Please log in to continue');
    }

    return {
      id: payload.sub,
      email: payload.email,
    };
  }
}
