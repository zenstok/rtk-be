import {
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { User } from '../user/entities/user.entity';
import { UPLOAD_DIR } from './file.constants';
import { FileService } from './file.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

const storage = diskStorage({
  destination: (req, _file, cb) => {
    const user = (req as any).user as User;
    const dir = path.join(UPLOAD_DIR, String(user.id));
    fs.mkdir(dir, { recursive: true })
      .then(() => cb(null, dir))
      .catch((err) => cb(err, dir));
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

@ApiTags('File')
@ApiBearerAuth()
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { storage, limits: { fileSize: MAX_FILE_SIZE } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  upload(
    @UploadedFile(new ParseFilePipe())
    file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.fileService.create(
      {
        name: file.filename,
        path: file.path,
        extension: path.extname(file.originalname),
        size: file.size,
        mimetype: file.mimetype,
      },
      user,
    );
  }

  @Get('download/:id')
  download(@Param('id') id: string): Promise<StreamableFile> {
    return this.fileService.getFileStream(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string): Promise<{ message: string }> {
    return this.fileService.delete(id);
  }
}
