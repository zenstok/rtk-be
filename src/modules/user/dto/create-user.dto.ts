import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '../../auth/constants/role.enum';
import {
  PASSWORD_REGEX,
  PASSWORD_REGEX_MESSAGE,
} from '../../../utils/constants/password';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REGEX_MESSAGE })
  password: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  lastName: string;
}
