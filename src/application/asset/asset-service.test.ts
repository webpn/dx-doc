import { SharpImageProcessor } from '@project/infrastructure/images/sharp-image-processor';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { PermissionService } from '../auth/permissions';
import type { AccountRepository } from '../ports/account-repository';
import type { AssetRecord, AssetRepository } from '../ports/asset-repository';
import type { ProjectRecord, ProjectRepository } from '../ports/project-repository';
import type { ObjectStorage } from '../ports/storage';

import { AssetService } from './asset-service';

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');
const PUBLIC_BASE_URL = 'https://cdn.dx.test';

class StubPermissions extends PermissionService {
  constructor(private readonly answers: { project?: boolean }) {
    super({} as AccountRepository);
  }

  override canOnProject(): Promise<boolean> {
    return Promise.resolve(this.answers.project ?? true);
  }
}

class FakeAssets implements AssetRepository {
  assets = new Map<string, AssetRecord>();

  createAsset(asset: AssetRecord): Promise<void> {
    this.assets.set(asset.id, asset);
    return Promise.resolve();
  }
  getAssetById(id: string): Promise<AssetRecord | null> {
    return Promise.resolve(this.assets.get(id) ?? null);
  }
  getAssetByCustomId(projectId: string, customId: string): Promise<AssetRecord | null> {
    for (const asset of this.assets.values()) {
      if (asset.projectId === projectId && asset.customId === customId) {
        return Promise.resolve(asset);
      }
    }
    return Promise.resolve(null);
  }
  listAssetsForProject(projectId: string): Promise<AssetRecord[]> {
    return Promise.resolve([...this.assets.values()].filter((a) => a.projectId === projectId));
  }
  deleteAsset(id: string): Promise<void> {
    this.assets.delete(id);
    return Promise.resolve();
  }
}

class FakeProjects implements ProjectRepository {
  projects = new Map<string, ProjectRecord>();
  createProject(p: ProjectRecord): Promise<void> {
    this.projects.set(p.id, p);
    return Promise.resolve();
  }
  getProjectById(id: string): Promise<ProjectRecord | null> {
    return Promise.resolve(this.projects.get(id) ?? null);
  }
  getProjectByCompanyAndSlug(): Promise<ProjectRecord | null> {
    return Promise.resolve(null);
  }
  getProjectByCustomId(): Promise<ProjectRecord | null> {
    return Promise.resolve(null);
  }
  listProjectsForCompany(): Promise<ProjectRecord[]> {
    return Promise.resolve([...this.projects.values()]);
  }
  updateProject(p: ProjectRecord, expectedUpdatedAt?: string): Promise<boolean> {
    const existing = this.projects.get(p.id);
    if (expectedUpdatedAt !== undefined && existing?.updatedAt !== expectedUpdatedAt) {
      return Promise.resolve(false);
    }
    this.projects.set(p.id, p);
    return Promise.resolve(true);
  }
}

class FakeStorage implements ObjectStorage {
  objects = new Map<string, Buffer>();
  put(key: string, body: Buffer, _contentType: string): Promise<void> {
    this.objects.set(key, body);
    return Promise.resolve();
  }
  get(key: string): Promise<Buffer | null> {
    return Promise.resolve(this.objects.get(key) ?? null);
  }
  delete(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }
  copy(sourceKey: string, destinationKey: string): Promise<void> {
    const source = this.objects.get(sourceKey);
    if (source === undefined) throw new Error('source missing');
    this.objects.set(destinationKey, source);
    return Promise.resolve();
  }
  checkHealth(): Promise<void> {
    return Promise.resolve();
  }
}

async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer();
}

function build(
  options: {
    project?: boolean;
    uploadMaxBytes?: number;
    imageMaxDimension?: number;
  } = {},
): {
  assets: FakeAssets;
  projects: FakeProjects;
  storage: FakeStorage;
  service: AssetService;
} {
  const assets = new FakeAssets();
  const projects = new FakeProjects();
  projects.projects.set('proj-1', {
    id: 'proj-1',
    companyId: 'c1',
    name: 'Web',
    slug: 'web',
    platform: 'web',
    description: null,
    icon: null,
    tagManager: null,
    lifecycleState: 'active',
    integrationSettings: null,
    customId: null,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
  });
  const storage = new FakeStorage();
  let counter = 0;
  const service = new AssetService(
    assets,
    projects,
    new StubPermissions(options.project === undefined ? {} : { project: options.project }),
    storage,
    new SharpImageProcessor(),
    options.uploadMaxBytes ?? 10_485_760,
    options.imageMaxDimension ?? 2000,
    PUBLIC_BASE_URL,
    () => FIXED_NOW,
    () => 'asset-' + String(++counter),
  );
  return { assets, projects, storage, service };
}

describe('AssetService.upload (REQ-IMP-004, REQ-AUTH-002, ADR-0026)', () => {
  it('uploads an image, storing it and returning a public URL', async () => {
    const { assets, storage, service } = build();
    const buffer = await makePng(100, 100);

    const result = await service.upload('u1', 'c1', 'proj-1', {
      buffer,
      filename: 'shot.png',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected upload to succeed');
    expect(result.value.created).toBe(true);
    expect(result.value.url).toBe(`${PUBLIC_BASE_URL}/assets/c1/proj-1/asset-1.png`);
    const stored = await assets.getAssetById(result.value.assetId);
    expect(stored?.width).toBe(100);
    expect(stored?.originalFilename).toBe('shot.png');
    if (stored === null) throw new Error('expected asset to be stored');
    expect(await storage.get(stored.storageKey)).not.toBeNull();
  });

  it('resizes an oversized image to the configured maximum', async () => {
    const { assets, service } = build({ imageMaxDimension: 50 });
    const buffer = await makePng(200, 100);

    const result = await service.upload('u1', 'c1', 'proj-1', { buffer, filename: 'big.png' });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected upload to succeed');
    const stored = await assets.getAssetById(result.value.assetId);
    expect(stored?.width).toBe(50);
    expect(stored?.height).toBe(25);
  });

  it('is idempotent on custom_id: a repeat upload returns the existing asset unchanged', async () => {
    const { assets, service } = build();
    const buffer = await makePng(100, 100);

    const first = await service.upload('u1', 'c1', 'proj-1', {
      buffer,
      filename: 'a.png',
      customId: 'legacy:hero',
    });
    const second = await service.upload('u1', 'c1', 'proj-1', {
      buffer: await makePng(300, 300),
      filename: 'b.png',
      customId: 'legacy:hero',
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error('expected both to succeed');
    expect(second.value.assetId).toBe(first.value.assetId);
    expect(second.value.created).toBe(false);
    expect(assets.assets.size).toBe(1);
    // The original (100x100) is untouched — the second upload's bytes never processed.
    expect((await assets.getAssetById(first.value.assetId))?.width).toBe(100);
  });

  it('rejects an upload exceeding the size cap', async () => {
    const { service } = build({ uploadMaxBytes: 10 });
    const buffer = await makePng(100, 100);

    const result = await service.upload('u1', 'c1', 'proj-1', { buffer, filename: 'a.png' });

    expect(result).toEqual({ ok: false, error: { kind: 'too_large', maxBytes: 10 } });
  });

  it('rejects a non-image upload', async () => {
    const { service } = build();

    const result = await service.upload('u1', 'c1', 'proj-1', {
      buffer: Buffer.from('not an image'),
      filename: 'a.txt',
    });

    expect(result).toEqual({ ok: false, error: { kind: 'unsupported_format' } });
  });

  it('returns not_found for a missing project', async () => {
    const { service } = build();
    const buffer = await makePng(10, 10);

    expect(
      await service.upload('u1', 'c1', 'missing-project', { buffer, filename: 'a.png' }),
    ).toEqual({ ok: false, error: { kind: 'not_found' } });
  });

  it('forbids upload without an edit grant', async () => {
    const { service } = build({ project: false });
    const buffer = await makePng(10, 10);

    expect(await service.upload('u1', 'c1', 'proj-1', { buffer, filename: 'a.png' })).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });
});

describe('AssetService.get/list/delete (ADR-0025, ADR-0026)', () => {
  it('deletes an asset unconditionally, removing it from storage too', async () => {
    const { assets, storage, service } = build();
    const buffer = await makePng(10, 10);
    const uploaded = await service.upload('u1', 'c1', 'proj-1', { buffer, filename: 'a.png' });
    if (!uploaded.ok) throw new Error('expected upload to succeed');

    expect(await service.delete('u1', uploaded.value.assetId)).toEqual({
      ok: true,
      value: { ok: true },
    });
    expect(await assets.getAssetById(uploaded.value.assetId)).toBeNull();
    expect(storage.objects.size).toBe(0);
  });

  it('lists assets scoped to a project with their URLs', async () => {
    const { service } = build();
    const buffer = await makePng(10, 10);
    await service.upload('u1', 'c1', 'proj-1', { buffer, filename: 'a.png' });
    await service.upload('u1', 'c1', 'proj-1', { buffer, filename: 'b.png' });

    const result = await service.list('u1', 'proj-1');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected list to succeed');
    expect(result.value).toHaveLength(2);
    expect(result.value.every((a) => a.url.startsWith(PUBLIC_BASE_URL))).toBe(true);
  });

  it('returns not_found for a missing asset', async () => {
    const { service } = build();
    expect(await service.get('u1', 'missing')).toEqual({ ok: false, error: { kind: 'not_found' } });
  });
});
