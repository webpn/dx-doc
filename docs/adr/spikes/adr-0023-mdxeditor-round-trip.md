# ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip

## Metadata

- **Date:** 2026-08-21
- **Engine tested:** `@mdxeditor/editor` **4.2.1** (pinned, as installed in `package.json`)
- **Spike test file:** [`spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx`](../../../spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx)
- **Harness:** the real `<MDXEditor>` React component, rendered with React Testing Library under jsdom (the repo's `ui` vitest project), driven through its public `MDXEditorMethods` ref (`getMarkdown()` / `setMarkdown()` — no hand-rolled Lexical import/export harness, per the task brief).
- **Method:** for each block type, mount `<MDXEditor markdown={input} ref={ref} plugins={[...]} />` and read `ref.current.getMarkdown()` immediately after mount. This is the save → reload round trip REQ-AUTH-001's acceptance criterion names ("every block round-trips through save and reload without lossy re-serialisation").
- **Vitest run command:** `npx vitest run --project ui spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx`
- **Result at time of writing:** **14/14 tests pass** — see [Real vitest output](#real-vitest-output) below.

## Plugin configuration used

```ts
[
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
```

Notes on this configuration:

- **Tables** are native GFM support inside `tablePlugin()` — no separate plugin or config needed.
- **Code blocks (including `mermaid`)** need _two_ plugins together: `codeBlockPlugin` registers the `code` mdast node import/export visitors and the default language fallback; `codeMirrorPlugin` registers the actual per-language editor descriptor. A fenced block only survives with its language tag if some registered `CodeBlockEditorDescriptor.match()` accepts `(language, meta)` — `codeMirrorPlugin`'s descriptor matches when the language key exists in its `codeBlockLanguages` map (or when `meta` is empty). `mermaid` was added to that map explicitly; without it, a `​```mermaid` fence still round-trips (it falls through to the `defaultCodeBlockLanguage` matcher, which accepts everything), but registering the language explicitly is the correct, intended path and was verified to preserve the tag.
- **Callouts** are not a first-class MDXEditor plugin — they are the documented markdown-directives extension point (`directivesPlugin` + `AdmonitionDirectiveDescriptor`, the library's own built-in descriptor for `:::note` / `:::tip` / `:::danger` / `:::info` / `:::caution`). This is the standard, documented way to get admonition-style callouts in MDXEditor; there is no alternative "callout" plugin name.
- **`markdownShortcutPlugin()`** is convenience-only (keyboard shortcuts like `**` → bold while typing) and was included because it is idiomatic in every MDXEditor example; it has no effect on `getMarkdown()`/`setMarkdown()` and was not required for any test to pass.

### AI-assist and CRDT/collaboration — confirmed off

ADR-0023 requires both switched off deliberately. **Enabling nothing extra is sufficient**: MDXEditor ships collaboration support only via a separate, explicitly-imported plugin (`remoteRealmPlugin` for cross-instance realm access; the library's docs describe a Yjs-based collaboration plugin as a distinct opt-in extension) and there is no MDX/JSX execution or AI-assist code path active unless the corresponding plugin (`jsxPlugin`, or a third-party AI plugin) is explicitly added to the `plugins` array. Neither `jsxPlugin` nor any collaboration/remote-realm plugin appears in the configuration above, and the spike's assertions do not depend on either being present. There is no "on by default, opt out" flag to remember — the risk is contained by omission, and the plugin list in this file is the audit trail for that omission.

## Per-block results

| Block (REQ-AUTH-001)                            | Result                | Notes                                                                                                                                                                                                                                             |
| ----------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Headings (H1–H6)                                | **PASS**              | Verbatim, level and text preserved exactly.                                                                                                                                                                                                       |
| Unordered list                                  | **NORMALISED** (pass) | `-` bullet marker on import is re-serialised as `*` on export, unconditionally. Content and item order identical.                                                                                                                                 |
| Ordered list                                    | **PASS**              | Verbatim, numbering and items preserved exactly.                                                                                                                                                                                                  |
| Bold                                            | **PASS**              | Verbatim, `**bold**` preserved exactly.                                                                                                                                                                                                           |
| Italic                                          | **NORMALISED** (pass) | `_italic_` on import is re-serialised as `*italic*` on export, unconditionally. Emphasis semantics and text identical.                                                                                                                            |
| Links                                           | **PASS**              | Verbatim, URL and link text preserved exactly.                                                                                                                                                                                                    |
| Tables (GFM)                                    | **NORMALISED** (pass) | Cell text, header row, and row count all identical. Every cell and the header separator row are padded with spaces to the widest cell in that column (cosmetic alignment). No cell value added, removed, or altered.                              |
| Code blocks (untagged)                          | **PASS**              | Verbatim, fence and code content preserved exactly.                                                                                                                                                                                               |
| Code blocks (` ```mermaid `)                    | **PASS**              | **Both the `mermaid` language tag and the diagram source text survive character-for-character.** This was tested as the content-not-formatting case the task explicitly calls out, and it passes verbatim — no reformatting of any kind observed. |
| Images                                          | **PASS**              | Verbatim, `src` and alt text preserved exactly.                                                                                                                                                                                                   |
| Quotes                                          | **PASS**              | Verbatim, blockquote content preserved exactly.                                                                                                                                                                                                   |
| Callouts (admonition directive, `:::note` etc.) | **PASS**              | Verbatim, `:::note` / `:::tip` / … type and inner content preserved exactly.                                                                                                                                                                      |
| Combined document (all blocks together)         | **PASS**              | Every block type above survives together in one document; only the same normalisations (bullets, italics) appear, no additional interaction effects.                                                                                              |

**All 14 test cases pass, and every departure from byte-for-byte identity is a documented, non-lossy reformatting — never a content loss.**

## Every normalisation observed

Across all fixtures, `getMarkdown()` differs from the literal input string in exactly these ways, consistently and only these ways:

1. **Trailing newline is not preserved.** Every input fixture ended with `\n`; every `getMarkdown()` output has no trailing newline. This is purely a whitespace convention at the very end of the document, not a content change (the caller controls whether it re-appends `\n` before writing to storage/git, and the git-export path (ADR-0018) is unaffected either way since the difference is a single trailing newline, invisible in a text diff of the block content).
2. **Unordered list bullets are normalised to `*`.** `-`-bullet input round-trips as `*`-bullet output. (Not tested here, but by the same mechanism a `+`-bullet input would round-trip as `*` too — the serializer emits one canonical bullet character regardless of the one the author typed.)
3. **Italic emphasis is normalised to `*text*`.** `_text_` input round-trips as `*text*` output. Bold (`**text**`) was not observed to change.
4. **GFM table cells and the header separator row are padded to each column's widest cell.** This is a common Markdown-table pretty-printing convention (also applied by, e.g., Prettier's own Markdown table formatter) and does not change the parsed table structure or any cell's text content.

No other divergence between input and output was observed in any of the 14 cases, including the combined document exercising every block type at once. In particular:

- The literal underscore inside a table cell value (`order_id`) was preserved intact in the combined-document case (the underscore is inside a table cell, which is not emphasis context, so it is not touched by rule 3 above).
- List item order, nesting depth (single level tested), heading levels, link URLs, image URLs and alt text, blockquote text, callout type keyword, and all code/mermaid content were identical byte-for-byte in every case.

## Verdict

**MDXEditor 4.2.1 satisfies ADR-0023's acceptance condition: YES.**

The Markdown → editor document → Markdown round trip is **lossless** over the full REQ-AUTH-001 block set (headings, ordered/unordered lists, bold, italic, links, tables, code blocks, ` ```mermaid ` fenced blocks with the language tag, images, quotes, and callouts), including when every block type appears together in a single document. The only divergences from a byte-for-byte round trip are the four normalisations listed above, all of which are formatting conventions applied consistently on export and none of which drop or alter document content or semantics. The `​```mermaid` case — flagged by the task as content, not formatting, because ADR-0018's git export and REQ-VER-004's textual diff depend on it — passed with **zero** reformatting: both the language tag and the diagram source text are preserved verbatim.

Because the round trip is lossless, **the ADR's named fallback (TipTap/ProseMirror or Lexical) does not need to be invoked.** M1.16 may proceed on the MDXEditor engine as amended in ADR-0023, subject to whatever the ADR owner decides about recording the four accepted normalisations (e.g. as a note on REQ-AUTH-001's acceptance criteria, so a future contributor does not mistake the bullet/italic/table normalisation for a regression).

One operational caveat for whoever wires the real editor into the application (not a round-trip defect, and out of scope for this spike to fix): rendering the ` ```mermaid ` block's CodeMirror editor under jsdom in this test run produced a non-fatal `TypeError: textRange(...).getClientRects is not a function` on `stderr`, from CodeMirror's view-measurement code trying to call a DOM Range method jsdom does not implement. The test still passed — `getMarkdown()` was read after mount and was unaffected — but this is a jsdom-only limitation of headless testing CodeMirror-backed code blocks, not a browser-runtime issue, and should not be mistaken for evidence against the round trip.

## Real vitest output

Captured from `npx vitest run --project ui --reporter=verbose spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx`:

```
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > heading: preserves level and text (normalised: trailing newline dropped) 554ms
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > heading: preserves all six levels 104ms
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > unordered list: reformats the bullet marker but keeps every item 77ms
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > ordered list: preserves numbering and items verbatim 44ms
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > bold: preserves strong emphasis 63ms
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > italic: normalises the delimiter from underscore to asterisk 61ms
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > link: preserves URL and link text 80ms
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > table: preserves headers, rows and cell content; pads column widths 459ms
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > code block: preserves an untagged fenced block verbatim 561ms
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > mermaid fenced block: preserves the language tag and diagram source verbatim 250ms
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > image: preserves src and alt text 120ms
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > quote: preserves blockquote content 54ms
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > callout (admonition directive): preserves type and content 111ms
 ✓ |ui| spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx > ADR-0023 acceptance spike — MDXEditor 4.2.1 Markdown round-trip > combined document: every required block survives round trip together 1075ms

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  14:10:58
   Duration  23.98s (transform 316ms, setup 1.71s, import 8.43s, tests 3.62s, environment 9.17s)
```

(The non-fatal `TypeError: textRange(...).getClientRects is not a function` stderr line from CodeMirror's jsdom-incompatible measurement code, mentioned in the Verdict caveat above, appeared before the mermaid test's pass line and did not affect its result.)

## How to reproduce

```bash
npx vitest run --project ui spikes/adr-0023-markdown-round-trip/mdxeditor-round-trip.test.tsx
```

The test file is picked up by the `ui` vitest project (jsdom + React Testing Library), whose `include` glob was extended with `spikes/**/*.test.{ts,tsx}` for this purpose (`vite.config.ts`); `tsconfig.json`'s `include` was extended with `spikes` so the file type-checks under the project's strict settings. Both changes are narrowly scoped additions, not modifications to how `src/` is built or tested.
