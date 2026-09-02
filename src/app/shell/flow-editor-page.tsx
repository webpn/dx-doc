import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from '@project/design-system';
import { useEffect, useRef, useState, type ReactElement, type SyntheticEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { FlowEdgeInput, FlowNodeInput } from '../api';
import { MermaidDiagram } from '../editor';
import { apiErrorMessageKey, useTranslate } from '../i18n';
import {
  useDeleteFlow,
  useFlow,
  usePages,
  useSetFlowGraph,
  useTriggers,
  useUpdateFlow,
} from '../queries';

import { ProjectWorkspace } from './project-workspace';

/**
 * Edit one flow: its metadata and the directed graph over the project's pages
 * (REQ-NAV-003, REQ-NAV-005).
 *
 * The graph is authored through a form-based list — nodes and edges are
 * relational tables, not a graph database (REQ-FDN-005), and REQ-NAV-005 is
 * explicit that edges are authored through a form-based list within the flow
 * page. The visual drag-and-drop editor is a separate, later requirement
 * (REQ-NAV-008).
 *
 * The generated Mermaid diagram (REQ-NAV-006) is rendered live from the saved
 * graph via the shared `MermaidDiagram` component (REQ-AUTH-004).
 */
export function FlowEditorPage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const { projectId, flowId } = useParams<{ projectId: string; flowId: string }>();
  const flow = useFlow(flowId);
  const pages = usePages(projectId);
  const triggers = useTriggers(projectId);
  const updateFlow = useUpdateFlow(flowId ?? '', projectId ?? '');
  const setGraph = useSetFlowGraph(flowId ?? '');
  const deleteFlow = useDeleteFlow(projectId ?? '');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Graph draft state, seeded from the loaded detail and edited locally until
  // "Save graph" sends the whole graph through `setGraph` (REQ-NAV-005).
  const [nodes, setNodes] = useState<FlowNodeInput[]>([]);
  const [edges, setEdges] = useState<FlowEdgeInput[]>([]);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [graphNotice, setGraphNotice] = useState<string | null>(null);

  // Node/edge authoring form state.
  const [newPageId, setNewPageId] = useState('');
  const [newTriggerId, setNewTriggerId] = useState('');
  const [edgeFrom, setEdgeFrom] = useState('');
  const [edgeTo, setEdgeTo] = useState('');
  const [edgeLabel, setEdgeLabel] = useState('');
  const [edgeCondition, setEdgeCondition] = useState('');

  // A node added locally has no server id yet. The API accepts a client id
  // (the server persists it verbatim), so each new node gets a stable local id
  // that edges can reference and that survives a save. The counter is a ref so
  // it never resets on a re-render.
  const localNodeCounter = useRef(0);
  const nextLocalNodeId = (): string => {
    localNodeCounter.current += 1;
    return `local-node-${String(localNodeCounter.current)}`;
  };

  const detail = flow.data;
  useEffect(() => {
    if (detail === undefined) return;
    setName(detail.flow.name);
    setSlug(detail.flow.slug);
    setDescription(detail.flow.description ?? '');
    setNodes(
      detail.nodes.map((node) => ({
        id: node.id,
        nodeType: node.nodeType,
        ...(node.pageId === null ? {} : { pageId: node.pageId }),
        ...(node.triggerId === null ? {} : { triggerId: node.triggerId }),
        ...(node.positionX === null ? {} : { positionX: node.positionX }),
        ...(node.positionY === null ? {} : { positionY: node.positionY }),
      })),
    );
    setEdges(
      detail.edges.map((edge) => ({
        id: edge.id,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        ...(edge.label === null ? {} : { label: edge.label }),
        ...(edge.conditionDescription === null
          ? {}
          : { conditionDescription: edge.conditionDescription }),
      })),
    );
  }, [detail]);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (name.trim() === '') {
      setError(t('flow.edit.missingName'));
      return;
    }
    if (slug.trim() === '') {
      setError(t('flow.edit.missingSlug'));
      return;
    }
    if (detail === undefined) return;

    try {
      await updateFlow.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        description,
        expectedUpdatedAt: detail.flow.updatedAt,
      });
      setNotice(t('flow.edit.saved'));
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  async function handleSaveGraph(): Promise<void> {
    setGraphError(null);
    setGraphNotice(null);
    try {
      await setGraph.mutateAsync({ nodes, edges });
      setGraphNotice(t('flow.edit.graphSaved'));
    } catch (cause) {
      setGraphError(t(apiErrorMessageKey(cause)));
    }
  }

  function handleAddPageNode(): void {
    setGraphError(null);
    if (newPageId === '') return;
    setNodes((current) => [
      ...current,
      { id: nextLocalNodeId(), nodeType: 'page', pageId: newPageId },
    ]);
    setNewPageId('');
  }

  function handleAddTriggerNode(): void {
    setGraphError(null);
    if (newTriggerId === '') return;
    setNodes((current) => [
      ...current,
      { id: nextLocalNodeId(), nodeType: 'trigger', triggerId: newTriggerId },
    ]);
    setNewTriggerId('');
  }

  function handleRemoveNode(nodeId: string): void {
    setGraphError(null);
    setNodes((current) => current.filter((node) => node.id !== nodeId));
    // An edge referencing a removed node is meaningless; drop it too.
    setEdges((current) =>
      current.filter((edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId),
    );
  }

  function handleAddEdge(): void {
    setGraphError(null);
    if (nodes.length < 2) {
      setGraphError(t('flow.edit.edgeNeedsNodes'));
      return;
    }
    if (edgeFrom === '' || edgeTo === '') {
      setGraphError(t('flow.edit.edgeNeedsDistinct'));
      return;
    }
    if (edgeFrom === edgeTo) {
      setGraphError(t('flow.edit.edgeNeedsDistinct'));
      return;
    }
    setEdges((current) => [
      ...current,
      {
        fromNodeId: edgeFrom,
        toNodeId: edgeTo,
        ...(edgeLabel === '' ? {} : { label: edgeLabel }),
        ...(edgeCondition === '' ? {} : { conditionDescription: edgeCondition }),
      },
    ]);
    setEdgeFrom('');
    setEdgeTo('');
    setEdgeLabel('');
    setEdgeCondition('');
  }

  function handleRemoveEdge(edgeIndex: number): void {
    setGraphError(null);
    setEdges((current) => current.filter((_, index) => index !== edgeIndex));
  }

  async function handleDelete(): Promise<void> {
    if (flowId === undefined) return;
    if (!window.confirm(t('flow.edit.deleteConfirm'))) return;

    setError(null);
    try {
      await deleteFlow.mutateAsync(flowId);
      void navigate(`/projects/${projectId ?? ''}/flows`);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  if (flow.isPending) {
    return <p>{t('flow.edit.loading')}</p>;
  }
  if (flow.error !== null || detail === undefined) {
    return <Alert variant="error">{t('flow.edit.loadError')}</Alert>;
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nodeLabel = (nodeId: string): string => {
    const node = nodeById.get(nodeId);
    if (node === undefined) return nodeId;
    if (node.nodeType === 'page') {
      return (pages.data ?? []).find((page) => page.id === node.pageId)?.name ?? node.pageId ?? '';
    }
    return (
      (triggers.data ?? []).find((trigger) => trigger.id === node.triggerId)?.name ??
      node.triggerId ??
      ''
    );
  };

  return (
    <ProjectWorkspace projectId={projectId ?? ''}>
      <Card>
        <CardHeader>
          <CardTitle>{t('flow.edit.title')}</CardTitle>
          <CardDescription>{t('flow.edit.subtitle')}</CardDescription>
        </CardHeader>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <Field htmlFor="flow-name" label={t('flow.edit.name')}>
            <Input
              id="flow-name"
              onChange={(e) => {
                setName(e.target.value);
              }}
              value={name}
            />
          </Field>
          <Field htmlFor="flow-slug" label={t('flow.edit.slug')}>
            <Input
              id="flow-slug"
              onChange={(e) => {
                setSlug(e.target.value);
              }}
              value={slug}
            />
          </Field>
          <Field htmlFor="flow-description" label={t('flow.edit.description')}>
            <Input
              id="flow-description"
              onChange={(e) => {
                setDescription(e.target.value);
              }}
              value={description}
            />
          </Field>
          {notice !== null ? <Alert variant="success">{notice}</Alert> : null}
          {error !== null ? <Alert variant="error">{error}</Alert> : null}
          <Button disabled={updateFlow.isPending} type="submit">
            {t('flow.edit.save')}
          </Button>
        </form>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('flow.edit.graph')}</CardTitle>
          <CardDescription>{t('flow.edit.graphHint')}</CardDescription>
        </CardHeader>

        <div className="flex flex-wrap items-end gap-4">
          <Field htmlFor="flow-add-page" label={t('flow.edit.nodePage')}>
            <select
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              id="flow-add-page"
              onChange={(e) => {
                setNewPageId(e.target.value);
              }}
              value={newPageId}
            >
              <option value="">{t('flow.edit.nodeNone')}</option>
              {(pages.data ?? []).map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          </Field>
          <Button
            disabled={newPageId === ''}
            onClick={handleAddPageNode}
            type="button"
            variant="secondary"
          >
            {t('flow.edit.addPageNode')}
          </Button>

          <Field htmlFor="flow-add-trigger" label={t('flow.edit.nodeTrigger')}>
            <select
              className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              id="flow-add-trigger"
              onChange={(e) => {
                setNewTriggerId(e.target.value);
              }}
              value={newTriggerId}
            >
              <option value="">{t('flow.edit.triggerNone')}</option>
              {(triggers.data ?? []).map((trigger) => (
                <option key={trigger.id} value={trigger.id}>
                  {trigger.name}
                </option>
              ))}
            </select>
          </Field>
          <Button
            disabled={newTriggerId === ''}
            onClick={handleAddTriggerNode}
            type="button"
            variant="secondary"
          >
            {t('flow.edit.addTriggerNode')}
          </Button>
        </div>

        {nodes.length === 0 ? (
          <p className="text-[var(--color-muted)]">{t('flow.edit.noNodes')}</p>
        ) : (
          <ul>
            {nodes.map((node) => (
              <li className="flex items-center gap-3 py-1" key={node.id}>
                <span className="text-sm text-[var(--color-ink)]">{nodeLabel(node.id ?? '')}</span>
                <span className="text-xs text-[var(--color-muted)]">
                  {node.nodeType === 'page' ? t('flow.edit.nodePage') : t('flow.edit.nodeTrigger')}
                </span>
                <Button
                  onClick={() => {
                    handleRemoveNode(node.id ?? '');
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {t('flow.edit.removeNode')}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">{t('flow.edit.edges')}</h3>
          <div className="flex flex-wrap items-end gap-4">
            <Field htmlFor="flow-edge-from" label={t('flow.edit.edgeFrom')}>
              <select
                className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                id="flow-edge-from"
                onChange={(e) => {
                  setEdgeFrom(e.target.value);
                }}
                value={edgeFrom}
              >
                <option value="">{t('flow.edit.edgeNeedsDistinct')}</option>
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {nodeLabel(node.id ?? '')}
                  </option>
                ))}
              </select>
            </Field>
            <Field htmlFor="flow-edge-to" label={t('flow.edit.edgeTo')}>
              <select
                className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                id="flow-edge-to"
                onChange={(e) => {
                  setEdgeTo(e.target.value);
                }}
                value={edgeTo}
              >
                <option value="">{t('flow.edit.edgeNeedsDistinct')}</option>
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {nodeLabel(node.id ?? '')}
                  </option>
                ))}
              </select>
            </Field>
            <Field htmlFor="flow-edge-label" label={t('flow.edit.edgeLabel')}>
              <Input
                id="flow-edge-label"
                onChange={(e) => {
                  setEdgeLabel(e.target.value);
                }}
                value={edgeLabel}
              />
            </Field>
            <Field htmlFor="flow-edge-condition" label={t('flow.edit.edgeCondition')}>
              <Input
                id="flow-edge-condition"
                onChange={(e) => {
                  setEdgeCondition(e.target.value);
                }}
                value={edgeCondition}
              />
            </Field>
            <Button onClick={handleAddEdge} type="button" variant="secondary">
              {t('flow.edit.addEdge')}
            </Button>
          </div>

          {edges.length === 0 ? (
            <p className="text-[var(--color-muted)]">{t('flow.edit.noEdges')}</p>
          ) : (
            <ul>
              {edges.map((edge, index) => (
                <li
                  className="flex items-center gap-3 py-1"
                  key={edge.id ?? `edge-${String(index)}`}
                >
                  <span className="text-sm text-[var(--color-ink)]">
                    {nodeLabel(edge.fromNodeId)} → {nodeLabel(edge.toNodeId)}
                  </span>
                  {edge.label !== undefined ? (
                    <span className="text-xs text-[var(--color-muted)]">{edge.label}</span>
                  ) : null}
                  <Button
                    onClick={() => {
                      handleRemoveEdge(index);
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {t('flow.edit.removeEdge')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {graphNotice !== null ? <Alert variant="success">{graphNotice}</Alert> : null}
        {graphError !== null ? <Alert variant="error">{graphError}</Alert> : null}
        <Button disabled={setGraph.isPending} onClick={() => void handleSaveGraph()} type="button">
          {t('flow.edit.saveGraph')}
        </Button>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('flow.edit.diagram')}</CardTitle>
          <CardDescription>{t('flow.edit.diagramHint')}</CardDescription>
        </CardHeader>
        <MermaidDiagram source={detail.mermaidDiagram} />
      </Card>

      <Button
        className="mt-6"
        disabled={deleteFlow.isPending}
        onClick={() => void handleDelete()}
        type="button"
        variant="secondary"
      >
        {t('flow.edit.delete')}
      </Button>
    </ProjectWorkspace>
  );
}
