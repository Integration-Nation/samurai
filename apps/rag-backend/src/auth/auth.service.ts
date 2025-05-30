import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { generateFromEmail } from 'unique-username-generator';
import { User } from '../users/entities/user.entity';
import { RegisterUserDto } from './dtos/register.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(User) private userRepository: EntityRepository<User>
  ) {
    this.logger.log(
      `JWT_SECRET is set: ${!!this.configService.get('JWT_SECRET')}`
    );
  }

  generateJwt(payload: { sub: string; email: string }): string {
    return this.jwtService.sign(payload);
  }

  async signIn(user: { email: string; name: string }): Promise<string> {
    if (!user) {
      throw new BadRequestException('Unauthenticated');
    }

    const userExists = await this.findUserByEmail(user.email);

    if (!userExists) {
      return this.registerUser(user);
    }

    return this.generateJwt({
      sub: userExists.id,
      email: userExists.email,
    });
  }

  async registerUser(user: RegisterUserDto): Promise<string> {
    try {
      const newUser = this.userRepository.create(user);
      newUser.username = generateFromEmail(user.email, 5);

      await this.userRepository.getEntityManager().persistAndFlush(newUser);

      return this.generateJwt({
        sub: newUser.id,
        email: newUser.email,
      });
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ email });
  }
}
