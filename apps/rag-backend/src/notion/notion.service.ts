import { Injectable } from '@nestjs/common';
import { Client, ListBlockChildrenResponse } from '@notionhq/client';
import { QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';

@Injectable()
export class NotionService {
  private notion: Client;

  constructor() {
    this.notion = new Client({
      auth: process.env.NOTION_TOKEN, // gemt i .env
    });
  }

async getPageContent(pageId: string): Promise<ListBlockChildrenResponse['results']> {
  const blocks = await this.notion.blocks.children.list({
    block_id: pageId,
  });
  return blocks.results;
}

async getDatabasePages(databaseId: string): Promise<QueryDatabaseResponse['results']> {
  const response = await this.notion.databases.query({
    database_id: databaseId,
  });
  return response.results;
}


  // Du kan tilføje flere metoder til at parse tekst, hente metadata osv.
}
