import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDTO {
  @IsString()
  @IsNotEmpty()
  name!: string;
  @IsEmail()
  @IsNotEmpty()
  email!: string;
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  password!: string;
}
