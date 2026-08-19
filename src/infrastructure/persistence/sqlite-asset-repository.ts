import type { AssetRecord, AssetRepository } from '@project/application/ports/asset-repository';

import type { Db } from './sqlite-kysely';

interface AssetRow {
  id: string;
  company_id: string;
  project_id: string;
  custom_id: string | null;
  storage_key: string;
  content_type: string;
  size_bytes: number;
  width: number;
  height: number;
  original_filename: string;
  created_at: string;
  updated_at: string;
}

function toAsset(row: AssetRow): AssetRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    projectId: row.project_id,
    customId: row.custom_id,
    storageKey: row.storage_key,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    originalFilename: row.original_filename,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** SQLite `AssetRepository` backed by Kysely (ADR-0024, ADR-0026). */
export class SqliteAssetRepository implements AssetRepository {
  constructor(private readonly db: Db) {}

  async createAsset(asset: AssetRecord): Promise<void> {
    await this.db
      .insertInto('assets')
      .values({
        id: asset.id,
        company_id: asset.companyId,
        project_id: asset.projectId,
        custom_id: asset.customId,
        storage_key: asset.storageKey,
        content_type: asset.contentType,
        size_bytes: asset.sizeBytes,
        width: asset.width,
        height: asset.height,
        original_filename: asset.originalFilename,
        created_at: asset.createdAt,
        updated_at: asset.updatedAt,
      })
      .execute();
  }

  async getAssetById(id: string): Promise<AssetRecord | null> {
    const row = await this.db
      .selectFrom('assets')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? toAsset(row) : null;
  }

  async getAssetByCustomId(projectId: string, customId: string): Promise<AssetRecord | null> {
    const row = await this.db
      .selectFrom('assets')
      .selectAll()
      .where('project_id', '=', projectId)
      .where('custom_id', '=', customId)
      .executeTakeFirst();
    return row ? toAsset(row) : null;
  }

  async listAssetsForProject(projectId: string): Promise<AssetRecord[]> {
    const rows = await this.db
      .selectFrom('assets')
      .selectAll()
      .where('project_id', '=', projectId)
      .execute();
    return rows.map(toAsset);
  }

  async deleteAsset(id: string): Promise<void> {
    await this.db.deleteFrom('assets').where('id', '=', id).execute();
  }
}
