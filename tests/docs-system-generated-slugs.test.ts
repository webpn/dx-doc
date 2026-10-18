import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REQ_FDN_PATH = 'docs/product/requirements/REQ-FDN.md';
const ADR_0004_PATH = 'docs/adr/0004-immutable-internal-identifiers.md';

function readDoc(filePath: string): string {
  return readFileSync(path.join(process.cwd(), filePath), 'utf8');
}

// Scope REQ assertions to the REQ-FDN-003 section so unrelated
// requirements can never trip them.
function reqFdn003Section(): string {
  const doc = readDoc(REQ_FDN_PATH);
  const start = doc.indexOf('### REQ-FDN-003');
  const end = doc.indexOf('### REQ-FDN-004');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return doc.slice(start, end);
}

// Sentences that affirm a user-supplied slug outside the company slug
// exception (which stays user-supplied by design). Negated statements
// such as "never user-supplied" describe the system-generated rule and
// are not regressions.
function affirmativeUserSuppliedSentences(text: string): string[] {
  return text
    .split(/(?<=[.\n])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .filter((sentence) => !/company/i.test(sentence))
    .filter((sentence) =>
      /user-supplied|supplied by the (user|client)|provided by the (user|client)|client-supplied/i.test(
        sentence,
      ),
    )
    .filter((sentence) => !/\b(never|not|no longer|n't)\b/i.test(sentence));
}

describe('docs state system-generated slugs (REQ-FDN-003, ADR-0004)', () => {
  it('REQ-FDN-003 describes the project slug as system-generated from the name', () => {
    const section = reqFdn003Section();

    expect(section).toContain('system-generated from the name');
    expect(section).toContain('regenerated on rename');
  });

  it('REQ-FDN-003 no longer instructs user-supplied project/page slugs', () => {
    expect(affirmativeUserSuppliedSentences(reqFdn003Section())).toEqual([]);
  });

  it('ADR-0004 describes project/page slugs as system-generated server-side', () => {
    const doc = readDoc(ADR_0004_PATH);

    expect(doc).toContain('system-generated server-side');
    expect(doc).toContain('regenerated on rename');
  });

  it('ADR-0004 no longer instructs user-supplied project/page slugs', () => {
    expect(affirmativeUserSuppliedSentences(readDoc(ADR_0004_PATH))).toEqual([]);
  });

  it('ADR-0004 keeps the company slug exception user-supplied', () => {
    expect(readDoc(ADR_0004_PATH)).toMatch(/company slug remains user-supplied/i);
  });
});
