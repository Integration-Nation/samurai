import { Body, Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { EntityManager, Repository } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CreateUserDTO } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly userRepository: Repository<User>;
  constructor(@InjectEntityManager() manager: EntityManager) {
    this.userRepository = manager.getRepository(User);
  }
  async findAll() {
    return this.userRepository.find();
  }
  async createUser(userDto: CreateUserDTO) {
    return this.userRepository.save(userDto);
  }
}
