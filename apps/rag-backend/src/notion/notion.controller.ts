import { Controller, Get, Query } from '@nestjs/common';
import { NotionService } from './notion.service';

@Controller('notion')
export class NotionController {
  constructor(private readonly notionService: NotionService) {}

  @Get('database')
  async getPages(@Query('db') databaseId: string) {
    return this.notionService.getDatabasePages(databaseId);
  }

  @Get('page')
  async getPage(@Query('id') pageId: string) {
    return this.notionService.getPageContent(pageId);
  }
}
