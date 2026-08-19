/**
 * Image processing port (ADR-0026). Sits behind an interface for the same
 * reason password hashing does (`PasswordHasher`): the concrete library
 * (`sharp`) stays confined to `src/infrastructure/`.
 */
export interface ProcessedImage {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
}

export interface ImageProcessor {
  /**
   * Validates `buffer` is a supported raster image and resizes it to fit
   * within `maxDimension` on its longer side (aspect ratio preserved, never
   * upscaled), preserving the original format. Returns `null` when `buffer`
   * is not a supported image format.
   */
  process(buffer: Buffer, maxDimension: number): Promise<ProcessedImage | null>;
}
