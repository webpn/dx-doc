/**
 * An uploaded image (REQ-IMP-004, REQ-AUTH-002, ADR-0026). `storageKey` is
 * the opaque key it lives under in the `ObjectStorage` port; the URL a
 * client loads it from is derived from that key, not stored (it depends on
 * instance configuration, not the asset itself).
 */
export interface AssetRecord {
  id: string;
  companyId: string;
  projectId: string;
  customId: string | null;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
  originalFilename: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetRepository {
  createAsset(asset: AssetRecord): Promise<void>;
  getAssetById(id: string): Promise<AssetRecord | null>;
  /** Idempotency lookup keyed on the orthogonal `custom_id` (REQ-IMP-003). */
  getAssetByCustomId(projectId: string, customId: string): Promise<AssetRecord | null>;
  listAssetsForProject(projectId: string): Promise<AssetRecord[]>;
  /** Nothing references an asset (ADR-0025); deletion is unconditional. */
  deleteAsset(id: string): Promise<void>;
}
