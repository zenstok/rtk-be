import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateFileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsString()
  @IsNotEmpty()
  extension: string;

  @IsNumber()
  size: number;

  @IsString()
  @IsNotEmpty()
  mimetype: string;
}
