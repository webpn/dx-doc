import type { ImageProcessor, ProcessedImage } from '@project/application';
import sharp from 'sharp';

/** Formats REQ-AUTH-002/REQ-IMP-004 cover — R1 scope is images, not general files (ADR-0026). */
const SUPPORTED_FORMATS: Readonly<Record<string, string>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** `sharp`-backed `ImageProcessor` (ADR-0026). */
export class SharpImageProcessor implements ImageProcessor {
  async process(buffer: Buffer, maxDimension: number): Promise<ProcessedImage | null> {
    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch {
      return null;
    }

    const contentType = SUPPORTED_FORMATS[metadata.format];
    if (contentType === undefined) {
      return null;
    }

    // Only resize when the image actually exceeds the threshold — never
    // upscale, and preserve the original format by not calling a format
    // method (ADR-0026).
    if (metadata.width <= maxDimension && metadata.height <= maxDimension) {
      return { buffer, contentType, width: metadata.width, height: metadata.height };
    }

    const resized = sharp(buffer).resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    });
    const outputBuffer = await resized.toBuffer();
    const outputMetadata = await sharp(outputBuffer).metadata();

    return {
      buffer: outputBuffer,
      contentType,
      width: outputMetadata.width,
      height: outputMetadata.height,
    };
  }
}
