import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFileDto } from './dto/create-file.dto';
import { File } from './entities/file.entity';
import { User } from '../user/entities/user.entity';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {}

  create(dto: CreateFileDto, uploader: User): Promise<File> {
    return this.fileRepository.save(
      this.fileRepository.create({
        name: dto.name,
        path: dto.path,
        extension: dto.extension,
        size: dto.size,
        mimetype: dto.mimetype,
        uploaderId: uploader.id,
      }),
    );
  }

  async getFileStream(id: string): Promise<StreamableFile> {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    try {
      await fs.access(file.path);
    } catch {
      throw new NotFoundException('File not found on disk');
    }

    const readStream = createReadStream(file.path);
    return new StreamableFile(readStream, {
      type: file.mimetype,
      disposition: `attachment; filename="${file.prettyFileName}"`,
      length: file.size,
    });
  }

  async delete(id: string): Promise<{ message: string }> {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    try {
      await fs.unlink(file.path);
    } catch {
      // File might not exist on disk, continue with DB deletion
    }

    await this.fileRepository.delete({ id });

    return { message: 'File deleted successfully' };
  }
}
