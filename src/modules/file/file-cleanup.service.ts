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
        this.logger.error(
          `Failed to delete orphan file ${file.id}`,
          error instanceof Error ? error.stack : String(error),
        );
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
      .leftJoin('customer_offers', 'co', 'co.customer_order_file_id = f.id')
      .leftJoin(
        'stock_entry_deliveries',
        'sed_w',
        'sed_w.warranty_file_id = f.id',
      )
      .leftJoin(
        'stock_entry_deliveries',
        'sed_h',
        'sed_h.handover_file_id = f.id',
      )
      .where('co.customer_order_file_id IS NULL')
      .andWhere('sed_w.warranty_file_id IS NULL')
      .andWhere('sed_h.handover_file_id IS NULL')
      .select(['f.id', 'f.path'])
      .getMany();
  }
}
