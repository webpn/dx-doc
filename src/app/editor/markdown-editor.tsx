import '@mdxeditor/editor/style.css';

import {
  AdmonitionDirectiveDescriptor,
  codeBlockPlugin,
  codeMirrorPlugin,
  directivesPlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import { forwardRef, useImperativeHandle, useMemo, useRef, type ReactElement } from 'react';

import { assetsApi } from '../api';
import { useTranslate } from '../i18n';

export interface MarkdownEditorHandle {
  /** The current document as Markdown — what gets persisted (REQ-AUTH-001). */
  getMarkdown: () => string;
  /** Replace the document, e.g. after loading a draft. */
  setMarkdown: (markdown: string) => void;
  /**
   * Upload one image and return its URL. This is the exact path the paste and
   * drag-and-drop handlers use (REQ-AUTH-002), exposed so callers — and tests —
   * can drive it without synthesising a clipboard event.
   */
  uploadImage: (file: File) => Promise<string>;
}

export interface MarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  /**
   * Company and project scope for image uploads. Both are required to upload:
   * an asset belongs to exactly one project, and there is no sensible default
   * (a guessed scope would cross the tenancy boundary).
   *
   * Explicitly `| undefined` because the repo sets
   * `exactOptionalPropertyTypes`: callers pass these straight from a route
   * param or a loading query, where the value is legitimately not known yet.
   */
  companyId?: string | undefined;
  projectId?: string | undefined;
  readOnly?: boolean | undefined;
}

/**
 * The single Markdown editor used for every rich-text field: tracking, page,
 * flow and property descriptions, and free pages (REQ-AUTH-001).
 *
 * Engine: MDXEditor, per ADR-0023. The plugin set below is exactly the one the
 * ADR-0023 acceptance spike proved round-trips the required block set without
 * losing content — including ` ```mermaid ` fences, which are stored verbatim
 * as code blocks in R1 (rendering them is REQ-AUTH-004, R2). Keep it in step
 * with `spikes/adr-0023-markdown-round-trip/` if either changes.
 *
 * Two features are switched off deliberately (ADR-0023): AI-assist and
 * CRDT/collaboration. MDXEditor ships both as separate plugins rather than
 * always-on behaviour, so *not importing them* is the whole mechanism — there
 * is no flag to unset. Do not add them without amending the ADR.
 */
export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor(
    { value, onChange, companyId, projectId, readOnly = false },
    ref,
  ): ReactElement {
    const t = useTranslate();
    const editorRef = useRef<MDXEditorMethods>(null);

    // Held in a ref so the plugin list below stays stable across renders (a
    // rebuilt plugin list remounts the editor and loses the caret), while the
    // handler itself always sees the current scope props.
    const uploadImage = useRef<(file: File) => Promise<string>>(
      /* replaced on every render, below */ () => Promise.reject(new Error('not ready')),
    );
    uploadImage.current = async (file: File): Promise<string> => {
      if (companyId === undefined || projectId === undefined) {
        throw new Error(t('editor.image.noScope'));
      }
      const result = await assetsApi.upload(companyId, projectId, file);
      return result.url;
    };

    useImperativeHandle(
      ref,
      () => ({
        getMarkdown: () => editorRef.current?.getMarkdown() ?? '',
        setMarkdown: (markdown: string) => {
          editorRef.current?.setMarkdown(markdown);
        },
        uploadImage: (file: File) => uploadImage.current(file),
      }),
      [],
    );

    const plugins = useMemo(
      () => [
        headingsPlugin(),
        listsPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        quotePlugin(),
        tablePlugin(),
        // Drag-and-drop and clipboard paste both route through this handler,
        // so REQ-AUTH-002's two entry points share one upload path.
        imagePlugin({ imageUploadHandler: (file: File) => uploadImage.current(file) }),
        thematicBreakPlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
        codeMirrorPlugin({
          codeBlockLanguages: {
            txt: 'Text',
            js: 'JavaScript',
            ts: 'TypeScript',
            json: 'JSON',
            mermaid: 'Mermaid',
          },
        }),
        directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
        markdownShortcutPlugin(),
      ],
      [],
    );

    return (
      <MDXEditor
        ref={editorRef}
        markdown={value}
        onChange={onChange}
        plugins={plugins}
        readOnly={readOnly}
        contentEditableClassName="dx-markdown-editor"
      />
    );
  },
);
