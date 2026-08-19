import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { SharpImageProcessor } from './sharp-image-processor';

async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })
    .png()
    .toBuffer();
}

describe('SharpImageProcessor (ADR-0026)', () => {
  it('returns the image unchanged when already within the dimension threshold', async () => {
    const processor = new SharpImageProcessor();
    const buffer = await makePng(400, 300);

    const result = await processor.process(buffer, 2000);

    expect(result).not.toBeNull();
    expect(result?.contentType).toBe('image/png');
    expect(result?.width).toBe(400);
    expect(result?.height).toBe(300);
  });

  it('resizes an oversized image to fit the threshold, preserving aspect ratio and format', async () => {
    const processor = new SharpImageProcessor();
    const buffer = await makePng(4000, 2000);

    const result = await processor.process(buffer, 2000);

    expect(result).not.toBeNull();
    expect(result?.contentType).toBe('image/png');
    expect(result?.width).toBe(2000);
    expect(result?.height).toBe(1000);
  });

  it('never upscales an image smaller than the threshold', async () => {
    const processor = new SharpImageProcessor();
    const buffer = await makePng(100, 50);

    const result = await processor.process(buffer, 2000);

    expect(result?.width).toBe(100);
    expect(result?.height).toBe(50);
  });

  it('preserves jpeg as jpeg and webp as webp', async () => {
    const processor = new SharpImageProcessor();
    const jpeg = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();
    const webp = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .webp()
      .toBuffer();

    expect((await processor.process(jpeg, 2000))?.contentType).toBe('image/jpeg');
    expect((await processor.process(webp, 2000))?.contentType).toBe('image/webp');
  });

  it('rejects a buffer that is not a supported image', async () => {
    const processor = new SharpImageProcessor();

    expect(await processor.process(Buffer.from('not an image'), 2000)).toBeNull();
  });

  it('rejects an unsupported image format (svg)', async () => {
    const processor = new SharpImageProcessor();
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
    );

    expect(await processor.process(svg, 2000)).toBeNull();
  });
});
