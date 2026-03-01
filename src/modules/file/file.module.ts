import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { FileRepository } from './repositories/file.repository';
import { FileCleanupService } from './file-cleanup.service';

@Module({
  imports: [TypeOrmModule.forFeature([File])],
  controllers: [FileController],
  providers: [FileService, FileCleanupService, FileRepository],
})
export class FileModule {}
