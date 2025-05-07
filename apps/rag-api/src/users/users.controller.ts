import { Body, Controller, Get, Post, ValidationPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDTO } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get()
  async findAll() {
    return await this.usersService.findAll();
  }
  @Post()
  async createUser(@Body(ValidationPipe) userDto: CreateUserDTO) {
    return await this.usersService.createUser(userDto);
  }
}
