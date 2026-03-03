import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_REGEX,
  PASSWORD_REGEX_MESSAGE,
} from '../../../utils/constants/password';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REGEX_MESSAGE })
  newPassword: string;
}
