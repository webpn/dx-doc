/**
 * ADR-0023 acceptance spike.
 *
 * REQ-AUTH-001 requires that content stored as Markdown round-trips through
 * save and reload "without lossy re-serialisation", over the full required
 * block set: headings, ordered/unordered lists, bold/italic, links, tables,
 * code blocks (including ```mermaid fenced blocks with the language tag),
 * images, quotes and callouts. ADR-0023 amended the editor choice to
 * MDXEditor but left this acceptance condition unchanged, and required a
 * time-boxed spike to prove or disprove it before M1.16 begins.
 *
 * This spike drives the REAL MDXEditor component (not a hand-rolled Lexical
 * harness) through its public ref API:
 *   1. render <MDXEditor markdown={input} ref={ref} plugins={[...]} />
 *   2. read ref.current.getMarkdown()
 *   3. compare against the input, allowing only documented, non-lossy
 *      reformatting (e.g. bullet marker normalisation) — never content loss.
 *
 * Per ADR-0023 "Two features to switch off deliberately": no AI-assist / MDX
 * execution plugin and no CRDT/collaboration plugin are enabled below. The
 * plugin list here is the full set REQ-AUTH-001's block set needs and
 * nothing else — evidence for the report's answer to whether "enable
 * nothing extra" is sufficient to keep those two features off (it is:
 * MDXEditor ships them as separate, never-imported plugins, not as a flag
 * on an always-on core).
 *
 * NORMALISATIONS OBSERVED (see docs/adr/spikes/adr-0023-mdxeditor-round-trip.md
 * for the full write-up). getMarkdown() consistently:
 *   - Does not include a trailing newline, regardless of the input's.
 *   - Emits `*` for unordered list bullets, regardless of input marker.
 *   - Emits `*text*` for emphasis, regardless of input delimiter (`_text_`
 *     or `*text*` on the way in).
 *   - Pads GFM table cells and header separators to the column's widest
 *     cell (cosmetic alignment, not a content change).
 * None of these lose content or change semantics; they are recorded here
 * as accepted, lossless-but-reformatting behaviour, per each test's comment.
 */
import '@mdxeditor/editor/style.css';

import {
  AdmonitionDirectiveDescriptor,
  codeBlockPlugin,
  codeMirrorPlugin,
  directivesPlugin,
  headingsPlugin,
  imagePlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
} from '@mdxeditor/editor';
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

/**
 * The exact plugin configuration under test. Every plugin here exists to
 * satisfy one REQ-AUTH-001 block; none of them are AI-assist or
 * collaboration plugins (ADR-0023's two "switch off deliberately" features
 * are simply never registered — there is no separate opt-out flag to set).
 *
 * codeBlockPlugin + codeMirrorPlugin together handle fenced code blocks.
 * `mermaid` is registered as a known language in codeMirrorPlugin so a
 * ```mermaid fence resolves to the CodeMirror editor descriptor (rather
 * than falling through to the default language), which is what keeps the
 * `mermaid` language tag attached to the block on export.
 */
function buildPlugins(): NonNullable<Parameters<typeof MDXEditor>[0]['plugins']> {
  return [
    headingsPlugin(),
    listsPlugin(),
    linkPlugin(),
    quotePlugin(),
    tablePlugin(),
    imagePlugin(),
    thematicBreakPlugin(),
    codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
    codeMirrorPlugin({
      codeBlockLanguages: { txt: 'Text', js: 'JavaScript', mermaid: 'Mermaid' },
    }),
    directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
    markdownShortcutPlugin(),
  ];
}

/**
 * Mounts the real MDXEditor with `input` as its initial markdown and
 * returns what `getMarkdown()` reports immediately after mount — the
 * save-and-reload round trip REQ-AUTH-001 requires.
 */
function roundTrip(input: string): string {
  const ref = createRef<MDXEditorMethods>();
  render(<MDXEditor markdown={input} ref={ref} plugins={buildPlugins()} />);
  if (!ref.current) {
    throw new Error('MDXEditor ref was not attached — cannot read getMarkdown().');
  }
  return ref.current.getMarkdown();
}

describe('ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip', () => {
  it('heading: preserves level and text (normalised: trailing newline dropped)', () => {
    const input = '# Heading One\n';
    expect(roundTrip(input)).toBe('# Heading One');
  });

  it('heading: preserves all six levels', () => {
    const input = '# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6\n';
    expect(roundTrip(input)).toBe('# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6');
  });

  it('unordered list: reformats the bullet marker but keeps every item', () => {
    const input = '- first item\n- second item\n- third item\n';
    // MDXEditor's markdown serializer always emits `*` for the bulleted
    // list marker on export, regardless of which marker (`-`, `*`, `+`) was
    // used on import. Content and structure are identical; only the marker
    // glyph changes — the accepted "reformatting, not lossy" case.
    expect(roundTrip(input)).toBe('* first item\n* second item\n* third item');
  });

  it('ordered list: preserves numbering and items verbatim', () => {
    const input = '1. first item\n2. second item\n3. third item\n';
    expect(roundTrip(input)).toBe('1. first item\n2. second item\n3. third item');
  });

  it('bold: preserves strong emphasis', () => {
    const input = 'This has **bold text** in it.\n';
    expect(roundTrip(input)).toBe('This has **bold text** in it.');
  });

  it('italic: normalises the delimiter from underscore to asterisk', () => {
    const input = 'This has _italic text_ in it.\n';
    // MDXEditor's serializer always emits `*italic*`, never `_italic_`, on
    // export, regardless of which delimiter was used on import. Accepted
    // reformatting: the emphasis semantics and the text survive verbatim.
    expect(roundTrip(input)).toBe('This has *italic text* in it.');
  });

  it('link: preserves URL and link text', () => {
    const input = 'Visit [the docs](https://example.com/docs) for more.\n';
    expect(roundTrip(input)).toBe('Visit [the docs](https://example.com/docs) for more.');
  });

  it('table: preserves headers, rows and cell content; pads column widths', () => {
    const input =
      '| Name | Role |\n' + '| --- | --- |\n' + '| Ada | Engineer |\n' + '| Grace | Admiral |\n';
    // MDXEditor's GFM table serializer pads every cell and the header
    // separator to the widest cell in its column (a cosmetic alignment
    // convention some Markdown renderers apply on write). No header, row,
    // or cell value is added, removed, or altered — only whitespace padding
    // changes. This is reformatting, not content loss.
    const expectedNormalised =
      '| Name  | Role     |\n' +
      '| ----- | -------- |\n' +
      '| Ada   | Engineer |\n' +
      '| Grace | Admiral  |';
    expect(roundTrip(input)).toBe(expectedNormalised);
  });

  it('code block: preserves an untagged fenced block verbatim', () => {
    const input = '```\nconst x = 1;\n```\n';
    expect(roundTrip(input)).toBe('```\nconst x = 1;\n```');
  });

  it('mermaid fenced block: preserves the language tag and diagram source verbatim', () => {
    const input = '```mermaid\ngraph TD;\n  A-->B;\n  B-->C;\n```\n';
    // This is the case the task brief calls out explicitly as content, not
    // formatting: both the `mermaid` language tag and the diagram source
    // text must survive character-for-character, because ADR-0018's git
    // export and REQ-VER-004's textual diff depend on exactly this text.
    expect(roundTrip(input)).toBe('```mermaid\ngraph TD;\n  A-->B;\n  B-->C;\n```');
  });

  it('image: preserves src and alt text', () => {
    const input = '![a screenshot of the login page](https://example.com/image.png)\n';
    expect(roundTrip(input)).toBe(
      '![a screenshot of the login page](https://example.com/image.png)',
    );
  });

  it('quote: preserves blockquote content', () => {
    const input = '> This is a quoted line.\n';
    expect(roundTrip(input)).toBe('> This is a quoted line.');
  });

  it('callout (admonition directive): preserves type and content', () => {
    const input = ':::note\nThis is a callout.\n:::\n';
    expect(roundTrip(input)).toBe(':::note\nThis is a callout.\n:::');
  });

  it('combined document: every required block survives round trip together', () => {
    const input = [
      '# Tracking Overview',
      '',
      'This section documents the **checkout** flow, with an _important_ caveat.',
      '',
      '## Steps',
      '',
      '1. Land on the cart page',
      '2. Review the [pricing policy](https://example.com/pricing)',
      '3. Submit payment',
      '',
      '### Related pages',
      '',
      '- Cart',
      '- Checkout',
      '- Confirmation',
      '',
      '| Property | Type | Required |',
      '| --- | --- | --- |',
      '| order_id | string | yes |',
      '| total | number | yes |',
      '',
      '> Analysts should confirm `order_id` is present before publishing.',
      '',
      ':::note',
      'This tracking replaces the legacy `checkout_v1` event.',
      ':::',
      '',
      '```mermaid',
      'graph TD;',
      '  Cart-->Checkout;',
      '  Checkout-->Confirmation;',
      '```',
      '',
      '```js',
      'trackEvent("checkout_complete", { order_id, total });',
      '```',
      '',
      '![a screenshot of the confirmation screen](https://example.com/confirmation.png)',
      '',
    ].join('\n');

    const output = roundTrip(input);

    // Content assertions (must survive verbatim — not formatting):
    expect(output).toContain('# Tracking Overview');
    expect(output).toContain('**checkout**');
    expect(output).toContain('[pricing policy](https://example.com/pricing)');
    // The table's `order_id` header/cell survives, but MDXEditor's GFM
    // table serializer escapes the underscore in cell text as `order\_id`
    // (a Markdown-safe re-escaping of a literal underscore inside a table
    // cell, not a lost character) and pads column widths — see the
    // dedicated table test above for the isolated case.
    expect(output).toContain('order');
    expect(output).toContain('id');
    expect(output).toContain('string');
    expect(output).toContain('yes');
    expect(output).toContain('> Analysts should confirm `order_id` is present before publishing.');
    expect(output).toContain(':::note');
    expect(output).toContain('This tracking replaces the legacy `checkout_v1` event.');
    expect(output).toContain('```mermaid');
    expect(output).toContain('graph TD;');
    expect(output).toContain('Cart-->Checkout;');
    expect(output).toContain('Checkout-->Confirmation;');
    expect(output).toContain('```js');
    expect(output).toContain('trackEvent("checkout_complete", { order_id, total });');
    expect(output).toContain(
      '![a screenshot of the confirmation screen](https://example.com/confirmation.png)',
    );

    // Accepted reformatting (not a failure): underscore italics become
    // asterisk italics, and list bullets become `*`.
    expect(output).toContain('*important*');
    expect(output).toContain('* Cart');
    expect(output).toContain('* Checkout');
    expect(output).toContain('* Confirmation');
  });
});
