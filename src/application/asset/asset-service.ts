import { randomUUID } from 'node:crypto';

import { err, ok, type Result } from '@project/shared';

import type { PermissionService } from '../auth/permissions';
import type { AssetRecord, AssetRepository } from '../ports/asset-repository';
import type { ImageProcessor } from '../ports/image-processor';
import type { ProjectRepository } from '../ports/project-repository';
import type { ObjectStorage } from '../ports/storage';

export type AssetServiceError =
  | { kind: 'forbidden' }
  | { kind: 'not_found' }
  | { kind: 'too_large'; maxBytes: number }
  | { kind: 'unsupported_format' };

export interface AssetUploadInput {
  buffer: Buffer;
  filename: string;
  customId?: string;
}

export interface AssetWithUrl {
  asset: AssetRecord;
  url: string;
}

/**
 * Asset upload pipeline (REQ-IMP-004, REQ-AUTH-002, ADR-0026). Images only in
 * R1: size-capped, resized to fit `imageMaxDimension`, stored through the
 * `ObjectStorage` port, and idempotent on `customId` (REQ-IMP-003) — a repeat
 * upload with the same `customId` returns the existing asset unchanged
 * rather than re-processing.
 */
export class AssetService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly projects: ProjectRepository,
    private readonly permissions: PermissionService,
    private readonly storage: ObjectStorage,
    private readonly imageProcessor: ImageProcessor,
    private readonly uploadMaxBytes: number,
    private readonly imageMaxDimension: number,
    private readonly publicBaseUrl: string,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  private toUrl(asset: AssetRecord): AssetWithUrl {
    return { asset, url: `${this.publicBaseUrl}/${asset.storageKey}` };
  }

  async upload(
    actorId: string,
    companyId: string,
    projectId: string,
    input: AssetUploadInput,
  ): Promise<Result<{ assetId: string; url: string; created: boolean }, AssetServiceError>> {
    if ((await this.projects.getProjectById(projectId)) === null) {
      return err({ kind: 'not_found' });
    }
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    if (input.customId !== undefined) {
      const existing = await this.assets.getAssetByCustomId(projectId, input.customId);
      if (existing !== null) {
        return ok({
          assetId: existing.id,
          url: this.toUrl(existing).url,
          created: false,
        });
      }
    }

    if (input.buffer.byteLength > this.uploadMaxBytes) {
      return err({ kind: 'too_large', maxBytes: this.uploadMaxBytes });
    }

    const processed = await this.imageProcessor.process(input.buffer, this.imageMaxDimension);
    if (processed === null) {
      return err({ kind: 'unsupported_format' });
    }

    const assetId = this.newId();
    const extension = processed.contentType.split('/')[1] ?? 'bin';
    const storageKey = `assets/${companyId}/${projectId}/${assetId}.${extension}`;
    await this.storage.put(storageKey, processed.buffer, processed.contentType);

    const nowIso = this.now().toISOString();
    const asset: AssetRecord = {
      id: assetId,
      companyId,
      projectId,
      customId: input.customId ?? null,
      storageKey,
      contentType: processed.contentType,
      sizeBytes: processed.buffer.byteLength,
      width: processed.width,
      height: processed.height,
      originalFilename: input.filename,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await this.assets.createAsset(asset);

    return ok({ assetId, url: this.toUrl(asset).url, created: true });
  }

  async get(actorId: string, assetId: string): Promise<Result<AssetWithUrl, AssetServiceError>> {
    const asset = await this.assets.getAssetById(assetId);
    if (asset === null) return err({ kind: 'not_found' });
    if (!(await this.permissions.canOnProject(actorId, asset.projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }
    return ok(this.toUrl(asset));
  }

  async list(
    actorId: string,
    projectId: string,
  ): Promise<Result<AssetWithUrl[], AssetServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }
    const list = await this.assets.listAssetsForProject(projectId);
    return ok(list.map((asset) => this.toUrl(asset)));
  }

  /** Nothing references an asset (ADR-0025); deletion is unconditional. */
  async delete(actorId: string, assetId: string): Promise<Result<{ ok: true }, AssetServiceError>> {
    const asset = await this.assets.getAssetById(assetId);
    if (asset === null) return err({ kind: 'not_found' });
    if (!(await this.permissions.canOnProject(actorId, asset.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }
    await this.storage.delete(asset.storageKey);
    await this.assets.deleteAsset(assetId);
    return ok({ ok: true });
  }
}
