import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import * as archiver from 'archiver';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RoleName } from '@/common/enums/rbac.enum';
import { RequestUser } from '@/auth/interfaces/jwt-payload.interface';

@Controller('buildings/:buildingId/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('buildingId') buildingId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documentsService.upload(buildingId, file, createDocumentDto, user.userId);
  }

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  findAll(@Param('buildingId') buildingId: string) {
    return this.documentsService.findAll(buildingId);
  }

  @Get(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  findOne(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.findOne(buildingId, id);
  }

  @Patch(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  update(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documentsService.update(buildingId, id, updateDocumentDto, user.userId);
  }

  @Get(':id/download')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  async download(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const fileInfo = await this.documentsService.getFilePath(buildingId, id);
    
    res.set({
      'Content-Type': fileInfo.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileInfo.filename)}"`,
    });
    
    const fileStream = createReadStream(fileInfo.path);
    fileStream.pipe(res);
  }

  @Post('download-zip')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  async downloadMultiple(
    @Param('buildingId') buildingId: string,
    @Body() body: { ids: string[] },
    @Res() res: Response,
  ) {
    const files = await this.documentsService.getMultipleFilePaths(buildingId, body.ids);
    
    if (files.length === 0) {
      res.status(404).json({ message: 'No files found' });
      return;
    }
    
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="documents_${Date.now()}.zip"`,
    });
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err) => {
      res.status(500).json({ message: err.message });
    });
    
    archive.pipe(res);
    
    for (const file of files) {
      archive.file(file.path, { name: file.filename });
    }
    
    await archive.finalize();
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  remove(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documentsService.remove(buildingId, id, user.userId);
  }
}
