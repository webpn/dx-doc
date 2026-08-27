import mermaid from 'mermaid';
import { useEffect, useId, useRef, useState, type ReactElement } from 'react';

export interface MermaidDiagramProps {
  /** Mermaid diagram source, e.g. the content of a ```mermaid fenced block. */
  source: string;
}

let initialized = false;

function ensureInitialized(): void {
  if (initialized) return;
  // securityLevel 'strict' (the default) already sanitises label HTML; set
  // explicitly so a future mermaid upgrade's own default change can't
  // silently loosen it — REQ-SEC's Markdown-sanitisation rule applies to
  // anything rendered from stored content, and a Mermaid label is exactly
  // that.
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
  initialized = true;
}

/**
 * Renders Mermaid source as an SVG diagram (REQ-AUTH-004): the format used
 * for both hand-written ` ```mermaid ` blocks (REQ-AUTH-001) and the
 * flow-graph generator's output (REQ-NAV-006). One renderer serves both, per
 * ADR-0023.
 *
 * A syntax error shows a legible message and leaves the source untouched —
 * mermaid.render throwing must never take down the rest of the page.
 */
export function MermaidDiagram(props: MermaidDiagramProps): ReactElement {
  const { source } = props;
  const reactId = useId();
  // mermaid.render needs a DOM-safe id with no colons; useId's `:r0:` form
  // is exactly the character mermaid's own id sanitiser would otherwise
  // have to work around, so strip it once here instead.
  const renderId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureInitialized();
    let cancelled = false;

    if (source.trim() === '') {
      setError(null);
      if (containerRef.current !== null) containerRef.current.innerHTML = '';
      return undefined;
    }

    mermaid
      .render(renderId, source)
      .then(({ svg }) => {
        if (cancelled || containerRef.current === null) return;
        containerRef.current.innerHTML = svg;
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      });

    return () => {
      cancelled = true;
    };
  }, [source, renderId]);

  if (error !== null) {
    return (
      <div className="rounded-md border border-[var(--color-danger)] bg-[var(--color-surface-muted)] p-3 text-sm text-[var(--color-danger)]">
        {error}
      </div>
    );
  }

  return <div ref={containerRef} />;
}
