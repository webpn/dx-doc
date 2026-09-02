import { apiRequest } from './client';

/**
 * A Flow as the API returns it (REQ-NAV-003): a named user journey with a
 * directed graph over the project's Pages. Purely representational — it
 * binds nothing and constrains nothing.
 */
export interface Flow {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  description: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FlowNodeType = 'page' | 'trigger';

/** A node in a flow's graph (REQ-NAV-004): either a Page or a Trigger. */
export interface FlowNode {
  id: string;
  flowId: string;
  nodeType: FlowNodeType;
  pageId: string | null;
  triggerId: string | null;
  positionX: number | null;
  positionY: number | null;
  createdAt: string;
}

/** An edge in a flow's graph (REQ-NAV-005): a labelled, conditioned connection between two nodes. */
export interface FlowEdge {
  id: string;
  flowId: string;
  fromNodeId: string;
  toNodeId: string;
  label: string | null;
  conditionDescription: string | null;
  createdAt: string;
}

/** A Trigger (REQ-NAV-004): the action distinct from a purely visual Page→Page transition. */
export interface Trigger {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlowCreateInput {
  name: string;
  slug: string;
  description?: string;
  customId?: string;
}

export interface FlowUpdateInput {
  name?: string;
  slug?: string;
  description?: string;
  customId?: string;
  /** Optimistic-concurrency guard (REQ-AUTH-005, ADR-0016). */
  expectedUpdatedAt?: string;
}

export interface FlowNodeInput {
  id?: string;
  nodeType: FlowNodeType;
  pageId?: string;
  triggerId?: string;
  positionX?: number;
  positionY?: number;
}

export interface FlowEdgeInput {
  id?: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  conditionDescription?: string;
}

export interface FlowGraphInput {
  nodes: FlowNodeInput[];
  edges: FlowEdgeInput[];
}

/** `TrackingService.getFlow`'s shape: the flow, its graph, and the diagram generated from it (REQ-NAV-006). */
export interface FlowDetail {
  flow: Flow;
  nodes: FlowNode[];
  edges: FlowEdge[];
  mermaidDiagram: string;
}

export interface TriggerCreateInput {
  name: string;
  description?: string;
  trackingIds?: string[];
  customId?: string;
}

export interface TriggerUpdateInput {
  name?: string;
  description?: string;
  trackingIds?: string[];
  customId?: string;
  /** Optimistic-concurrency guard (REQ-AUTH-005, ADR-0016). */
  expectedUpdatedAt?: string;
}

export interface TriggerDetail {
  trigger: Trigger;
  trackingIds: string[];
}

export const flowsApi = {
  list: (projectId: string): Promise<Flow[]> =>
    apiRequest<Flow[]>(`/api/projects/${encodeURIComponent(projectId)}/flows`),

  get: (flowId: string): Promise<FlowDetail> =>
    apiRequest<FlowDetail>(`/api/flows/${encodeURIComponent(flowId)}`),

  create: (projectId: string, input: FlowCreateInput): Promise<{ id: string }> =>
    apiRequest<{ id: string }>(`/api/projects/${encodeURIComponent(projectId)}/flows`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (flowId: string, input: FlowUpdateInput): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/flows/${encodeURIComponent(flowId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  setGraph: (flowId: string, input: FlowGraphInput): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/flows/${encodeURIComponent(flowId)}/graph`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  remove: (flowId: string): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/flows/${encodeURIComponent(flowId)}`, { method: 'DELETE' }),
};

export const triggersApi = {
  list: (projectId: string): Promise<Trigger[]> =>
    apiRequest<Trigger[]>(`/api/projects/${encodeURIComponent(projectId)}/triggers`),

  get: (triggerId: string): Promise<TriggerDetail> =>
    apiRequest<TriggerDetail>(`/api/triggers/${encodeURIComponent(triggerId)}`),

  create: (projectId: string, input: TriggerCreateInput): Promise<{ id: string }> =>
    apiRequest<{ id: string }>(`/api/projects/${encodeURIComponent(projectId)}/triggers`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (triggerId: string, input: TriggerUpdateInput): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/triggers/${encodeURIComponent(triggerId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  remove: (triggerId: string): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/triggers/${encodeURIComponent(triggerId)}`, {
      method: 'DELETE',
    }),
};
