import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { CreateUserDTO } from './dto/create-user.dto';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>
  ) {}
  async findAll() {
    return this.userRepository.findAll();
  }
  async createUser(userDto: CreateUserDTO): Promise<User> {
    const user = this.userRepository.create({ ...userDto });
    await this.userRepository.getEntityManager().persistAndFlush(user);
    return user;
  }
}
