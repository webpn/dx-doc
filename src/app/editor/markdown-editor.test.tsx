import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as AppApi from '../api';

import type { MarkdownEditorHandle } from './markdown-editor';
import { MarkdownEditor } from './markdown-editor';

// `vi.mock` factories are hoisted above the file's variable declarations, so
// the mock function has to be created inside `vi.hoisted` to exist in time.
const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof AppApi>();
  return { ...actual, assetsApi: { ...actual.assetsApi, upload } };
});

function pngFile(name = 'shot.png', bytes = 8): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}

describe('MarkdownEditor', () => {
  beforeEach(() => {
    upload.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('round-trips the full REQ-AUTH-001 block set through its handle', () => {
    // The engine's round-trip fidelity is proven by the ADR-0023 spike; this
    // asserts the wrapper does not *undo* it by dropping a needed plugin.
    const source = [
      '# Heading',
      '',
      'Text with **bold** and *italic* and a [link](https://example.com).',
      '',
      '* one',
      '* two',
      '',
      '1. first',
      '2. second',
      '',
      '> A quote',
      '',
      '| a | b |',
      '| - | - |',
      '| 1 | 2 |',
      '',
      '```mermaid',
      'graph TD;',
      '  A-->B;',
      '```',
    ].join('\n');

    const ref = createRef<MarkdownEditorHandle>();
    renderWithProviders(<MarkdownEditor value={source} onChange={vi.fn()} ref={ref} />);

    const exported = ref.current?.getMarkdown() ?? '';

    // Content, not formatting: the mermaid tag and its source must survive.
    expect(exported).toContain('```mermaid');
    expect(exported).toContain('graph TD;');
    expect(exported).toContain('A-->B;');
    // Every other block still present.
    expect(exported).toContain('# Heading');
    expect(exported).toContain('**bold**');
    expect(exported).toContain('[link](https://example.com)');
    expect(exported).toContain('> A quote');
    expect(exported).toContain('| a');
    expect(exported).toContain('1. first');
  });

  it('uploads a pasted image and inserts it as markdown (REQ-AUTH-002)', async () => {
    upload.mockResolvedValueOnce({ id: 'a1', url: '/assets/a1.png', created: true });

    const ref = createRef<MarkdownEditorHandle>();
    renderWithProviders(
      <MarkdownEditor
        value=""
        onChange={vi.fn()}
        companyId="cmp_1"
        projectId="prj_1"
        ref={ref}
      />,
    );

    // The editor exposes the same path the paste/drop handler uses, so the
    // upload contract is tested without simulating a clipboard event (jsdom
    // cannot produce a real one with file data).
    const url = await ref.current?.uploadImage(pngFile());

    expect(upload).toHaveBeenCalledWith('cmp_1', 'prj_1', expect.any(File));
    expect(url).toBe('/assets/a1.png');
  });

  it('reports the server message when an upload is rejected', async () => {
    upload.mockRejectedValueOnce(
      Object.assign(new Error('File exceeds the 10 MB limit'), {
        name: 'ApiClientError',
        status: 400,
        code: 'PAYLOAD_TOO_LARGE',
      }),
    );

    const ref = createRef<MarkdownEditorHandle>();
    renderWithProviders(
      <MarkdownEditor
        value=""
        onChange={vi.fn()}
        companyId="cmp_1"
        projectId="prj_1"
        ref={ref}
      />,
    );

    await expect(ref.current?.uploadImage(pngFile())).rejects.toThrow(
      'File exceeds the 10 MB limit',
    );
  });

  it('refuses to upload without a project scope rather than guessing one', async () => {
    const ref = createRef<MarkdownEditorHandle>();
    renderWithProviders(<MarkdownEditor value="" onChange={vi.fn()} ref={ref} />);

    // No companyId/projectId: an image has nowhere to go. Uploading to a
    // guessed scope would cross the tenancy boundary.
    await expect(ref.current?.uploadImage(pngFile())).rejects.toThrow();
    expect(upload).not.toHaveBeenCalled();
  });

  it('notifies the parent when the document changes', async () => {
    const onChange = vi.fn();
    renderWithProviders(<MarkdownEditor value="start" onChange={onChange} />);

    const box = await screen.findByRole('textbox');
    await userEvent.click(box);
    await userEvent.type(box, ' more');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });
});
