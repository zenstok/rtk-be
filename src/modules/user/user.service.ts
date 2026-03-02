import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './repositories/user.repository';
import { FindDto } from '../../utils/dtos/find.dto';
import { BCRYPT_SALT_ROUNDS } from '../auth/auth.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(dto: CreateUserDto) {
    const existing = await this.userRepository.findOneBy({ email: dto.email });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    return this.userRepository.save({
      ...dto,
      password: hashedPassword,
    });
  }

  async findAll(dto: FindDto) {
    const [results, total] = await this.userRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });
    return { results, total };
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    if (!(await this.userRepository.existsBy({ id }))) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.update({ id }, dto);
    return { message: 'User updated successfully' };
  }

  async remove(id: number) {
    if (!(await this.userRepository.existsBy({ id }))) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.delete({ id });
    return { message: 'User deleted successfully' };
  }
}
