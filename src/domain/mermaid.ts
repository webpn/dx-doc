import type { FlowEdge, FlowNode } from './entities';

/**
 * Generate a Mermaid diagram string from a directed flow graph (REQ-NAV-006).
 */
export function generateMermaidDiagram(
  nodes: FlowNode[],
  edges: FlowEdge[],
  nodeLabelMap: Map<string, string>, // nodeId -> display name / label
): string {
  const lines: string[] = ['graph TD'];

  // Declare nodes with shapes: Pages as rectangles [Name], Triggers as rounded/stadium ([Name])
  for (const node of nodes) {
    const label = nodeLabelMap.get(node.id) ?? node.id;
    const cleanLabel = label.replace(/"/g, "'");
    if (node.nodeType === 'page') {
      lines.push(`  ${node.id}["${cleanLabel}"]`);
    } else {
      lines.push(`  ${node.id}(["${cleanLabel}"])`);
    }
  }

  // Declare edges with optional labels
  for (const edge of edges) {
    if (edge.label) {
      const cleanEdgeLabel = edge.label.replace(/"/g, "'");
      lines.push(`  ${edge.fromNodeId} -->|"${cleanEdgeLabel}"| ${edge.toNodeId}`);
    } else {
      lines.push(`  ${edge.fromNodeId} --> ${edge.toNodeId}`);
    }
  }

  return lines.join('\n');
}
