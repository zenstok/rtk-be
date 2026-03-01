import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { File } from './entities/file.entity';
import { FileService } from './file.service';

@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly fileService: FileService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async deleteOrphanFiles() {
    this.logger.log('Starting orphan files cleanup...');

    const orphanFiles = await this.findOrphanFiles();

    if (orphanFiles.length === 0) {
      this.logger.log('No orphan files found.');
      return;
    }

    this.logger.log(`Found ${orphanFiles.length} orphan files. Deleting...`);

    let deletedCount = 0;
    for (const file of orphanFiles) {
      try {
        await this.fileService.delete(file.id);
        deletedCount++;
      } catch (error) {
        this.logger.error(`Failed to delete orphan file ${file.id}}`);
        console.error(error);
      }
    }

    this.logger.log(
      `Orphan files cleanup completed. Deleted ${deletedCount}/${orphanFiles.length} files.`,
    );
  }

  private async findOrphanFiles(): Promise<File[]> {
    return this.dataSource
      .getRepository(File)
      .createQueryBuilder('f')
      .leftJoin('assigned_work_stage_files', 'awsf', 'awsf.file_id = f.id')
      .leftJoin('remedial_work_stage_files', 'rwsf', 'rwsf.file_id = f.id')
      .where('awsf.file_id IS NULL')
      .andWhere('rwsf.file_id IS NULL')
      .getMany();
  }
}
