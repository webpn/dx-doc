import {
  CodeMirrorEditor,
  type CodeBlockEditorDescriptor,
  type CodeBlockEditorProps,
} from '@mdxeditor/editor';
import type { ReactElement } from 'react';

import { MermaidDiagram } from './mermaid-diagram';

/**
 * Live-preview editor for ` ```mermaid ` fenced blocks (REQ-AUTH-004): the
 * stock CodeMirror source editor plus the rendered diagram beneath it,
 * updating as the source changes. Editing behaviour (undo, syntax
 * highlighting) is unchanged — this only adds the preview.
 */
function MermaidCodeBlockEditor(props: CodeBlockEditorProps): ReactElement {
  return (
    <div>
      <CodeMirrorEditor {...props} />
      <MermaidDiagram source={props.code} />
    </div>
  );
}

/**
 * Registered in `markdown-editor.tsx`'s `codeBlockPlugin` — a higher
 * `priority` than the generic CodeMirror descriptor (0) so it wins the match
 * for the `mermaid` language specifically, per the `CodeBlockEditorDescriptor`
 * priority contract.
 */
export const mermaidCodeBlockEditorDescriptor: CodeBlockEditorDescriptor = {
  priority: 10,
  match: (language) => language === 'mermaid',
  Editor: MermaidCodeBlockEditor,
};
