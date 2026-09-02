import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  flowsApi,
  triggersApi,
  type FlowCreateInput,
  type FlowGraphInput,
  type FlowUpdateInput,
  type TriggerCreateInput,
  type TriggerUpdateInput,
} from '../api';

import { queryKeys } from './keys';

export function useFlows(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.flows(projectId ?? ''),
    queryFn: () => flowsApi.list(projectId ?? ''),
    enabled: projectId !== undefined,
  });
}

export function useFlow(flowId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.flow(flowId ?? ''),
    queryFn: () => flowsApi.get(flowId ?? ''),
    enabled: flowId !== undefined,
  });
}

export function useCreateFlow(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FlowCreateInput) => flowsApi.create(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.flows(projectId) });
    },
  });
}

export function useUpdateFlow(flowId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FlowUpdateInput) => flowsApi.update(flowId, input),
    onSuccess: () => {
      // The flow itself and the listing: a rename or a slug change alters how
      // the flow appears in the list, not just its own record.
      void queryClient.invalidateQueries({ queryKey: queryKeys.flow(flowId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.flows(projectId) });
    },
  });
}

export function useSetFlowGraph(flowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FlowGraphInput) => flowsApi.setGraph(flowId, input),
    onSuccess: () => {
      // The graph is part of the flow detail (REQ-NAV-006 returns the
      // regenerated diagram alongside it), so a graph save refreshes the whole
      // detail, not just a node/edge list.
      void queryClient.invalidateQueries({ queryKey: queryKeys.flow(flowId) });
    },
  });
}

export function useDeleteFlow(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flowId: string) => flowsApi.remove(flowId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.flows(projectId) });
    },
  });
}

export function useTriggers(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.triggers(projectId ?? ''),
    queryFn: () => triggersApi.list(projectId ?? ''),
    enabled: projectId !== undefined,
  });
}

export function useTrigger(triggerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trigger(triggerId ?? ''),
    queryFn: () => triggersApi.get(triggerId ?? ''),
    enabled: triggerId !== undefined,
  });
}

export function useCreateTrigger(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TriggerCreateInput) => triggersApi.create(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.triggers(projectId) });
    },
  });
}

export function useUpdateTrigger(triggerId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TriggerUpdateInput) => triggersApi.update(triggerId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trigger(triggerId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.triggers(projectId) });
    },
  });
}

export function useDeleteTrigger(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (triggerId: string) => triggersApi.remove(triggerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.triggers(projectId) });
    },
  });
}