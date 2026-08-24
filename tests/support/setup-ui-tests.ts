import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * jsdom implements no layout, so the geometry APIs that editors built on
 * Lexical/CodeMirror call while positioning selections and toolbars (MDXEditor,
 * per ADR-0023) either do not exist or return nothing usable. The failure is
 * asynchronous — it surfaces *after* an assertion has already passed — so
 * vitest reports an unhandled error and a non-zero exit even when every test is
 * green.
 *
 * These overrides return an empty rectangle: enough for the measuring code to
 * complete. They are assigned unconditionally because jsdom *does* define
 * `Range.prototype.getBoundingClientRect` (it just returns an all-zero rect
 * that the editor's code path cannot use), so a `??=` would never apply.
 *
 * They deliberately do not fake layout — a test that needs real geometry
 * belongs in the Playwright suite, in a real browser.
 */
const emptyRect: DOMRect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
  toJSON: () => ({}),
};

function emptyRectList(): DOMRectList {
  const list: DOMRect[] = [emptyRect];
  return Object.assign(list, {
    item: (index: number): DOMRect | null => list[index] ?? null,
  });
}

Range.prototype.getBoundingClientRect = (): DOMRect => emptyRect;
Range.prototype.getClientRects = (): DOMRectList => emptyRectList();

afterEach(() => {
  cleanup();
});
