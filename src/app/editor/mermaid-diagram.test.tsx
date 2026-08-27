import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';

import { MermaidDiagram } from './mermaid-diagram';

describe('MermaidDiagram (REQ-AUTH-004)', () => {
  it('renders valid Mermaid source as an SVG diagram', async () => {
    const { container } = renderWithProviders(<MermaidDiagram source={'graph TD;\n  A-->B;'} />);

    await waitFor(() => {
      expect(container.querySelector('svg')).not.toBeNull();
    });
  });

  it('shows a legible message for invalid source and never throws', async () => {
    renderWithProviders(<MermaidDiagram source="not a valid diagram {{{" />);

    expect(await screen.findByText(/no diagram type detected/i)).toBeInTheDocument();
  });

  it('renders nothing for an empty source rather than an error', () => {
    const { container } = renderWithProviders(<MermaidDiagram source="" />);

    expect(container.querySelector('svg')).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('re-renders when the source changes', async () => {
    const { rerender, container } = renderWithProviders(
      <MermaidDiagram source={'graph TD;\n  A-->B;'} />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).not.toBeNull();
    });
    const first = container.querySelector('svg')?.textContent;

    rerender(<MermaidDiagram source={'graph TD;\n  X-->Y-->Z;'} />);

    await waitFor(() => {
      expect(container.querySelector('svg')?.textContent).not.toBe(first);
    });
  });
});
