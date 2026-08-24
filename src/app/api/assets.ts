import { apiRequest } from './client';

export interface AssetUploadResult {
  id: string;
  url: string;
  created: boolean;
}

export interface AssetRecord {
  id: string;
  projectId: string;
  filename: string;
  contentType: string;
  byteSize: number;
  url: string;
  customId: string | null;
  createdAt: string;
}

export const assetsApi = {
  /**
   * Upload one image (REQ-AUTH-002). The size cap and the resize to
   * IMAGE_MAX_DIMENSION are enforced by the server's AssetService, not here —
   * the client sends the bytes and reports whatever the server decides, so the
   * limit lives in one place for every entry point (REQ-FDN-010).
   */
  upload(
    companyId: string,
    projectId: string,
    file: File,
    customId?: string,
  ): Promise<AssetUploadResult> {
    const form = new FormData();
    form.append('file', file, file.name);

    const query = new URLSearchParams({ companyId });
    if (customId !== undefined) query.set('customId', customId);

    return apiRequest<AssetUploadResult>(
      `/api/projects/${encodeURIComponent(projectId)}/assets?${query.toString()}`,
      { method: 'POST', body: form },
    );
  },
  list(projectId: string): Promise<AssetRecord[]> {
    return apiRequest<AssetRecord[]>(`/api/projects/${encodeURIComponent(projectId)}/assets`);
  },
};
