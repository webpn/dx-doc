import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  catalogueApi,
  destinationsApi,
  modulesApi,
  navigationEventsApi,
  propertiesApi,
  trackingsApi,
  trackingTemplatesApi,
  type DestinationUpdateInput,
  type ModuleCreateInput,
  type ModuleUpdateInput,
  type Presence,
  type PropertyCreateInput,
  type PropertyUpdateInput,
  type TrackingCreateInput,
  type TrackingTemplateUpdateInput,
  type TrackingUpdateInput,
} from '../api';

import { queryKeys } from './keys';

export function useTrackings(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trackings(projectId ?? ''),
    queryFn: () => trackingsApi.list(projectId ?? ''),
    enabled: projectId !== undefined,
  });
}

export function useTracking(trackingId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tracking(trackingId ?? ''),
    queryFn: () => trackingsApi.get(trackingId ?? ''),
    enabled: trackingId !== undefined,
  });
}

export function useNavigationEvents(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.navigationEvents(projectId ?? ''),
    queryFn: () => navigationEventsApi.list(projectId ?? ''),
    enabled: projectId !== undefined,
  });
}

export function useModules(companyId: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: queryKeys.modules(companyId ?? '', projectId),
    queryFn: () => modulesApi.list(companyId ?? '', projectId),
    enabled: companyId !== undefined,
  });
}

export function useProperties(companyId: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: queryKeys.properties(companyId ?? '', projectId),
    queryFn: () => propertiesApi.list(companyId ?? '', projectId),
    enabled: companyId !== undefined,
  });
}

export function useCreateTracking(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TrackingCreateInput) => trackingsApi.create(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackings(projectId) });
    },
  });
}

export function useUpdateTracking(trackingId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TrackingUpdateInput) => trackingsApi.update(trackingId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tracking(trackingId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackings(projectId) });
    },
  });
}

export function useApplyModule(trackingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moduleId: string) => trackingsApi.applyModule(trackingId, moduleId),
    onSuccess: () => {
      // A module brings its whole property set with it (REQ-DOM-007), so the
      // tracking's properties change, not just its module list.
      void queryClient.invalidateQueries({ queryKey: queryKeys.tracking(trackingId) });
    },
  });
}

/**
 * Removing a property may detach the module that supplied it (REQ-DOM-008).
 * The mutation result carries `warnModuleDetached` so the caller can warn;
 * it is deliberately not swallowed here.
 */
export function useRemoveTrackingProperty(trackingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (propertyId: string) => trackingsApi.removeProperty(trackingId, propertyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tracking(trackingId) });
    },
  });
}

export function useSetPresence(trackingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { propertyId: string; presence: Presence }) =>
      trackingsApi.setPresence(trackingId, input.propertyId, input.presence),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tracking(trackingId) });
    },
  });
}

export function useAddSpecificValue(trackingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { trackingPropertyId: string; value: string; description?: string }) =>
      trackingsApi.addSpecificValue(input.trackingPropertyId, {
        value: input.value,
        ...(input.description === undefined ? {} : { description: input.description }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tracking(trackingId) });
    },
  });
}

export function useRemoveSpecificValue(trackingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (specificValueId: string) => trackingsApi.removeSpecificValue(specificValueId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tracking(trackingId) });
    },
  });
}

/**
 * Copy catalogue items into a project (REQ-DOM-019). Both the project's
 * property list and its module list gain entries, so both are invalidated.
 */
export function useCopyCatalogue(companyId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (selection: { propertyIds?: string[]; moduleIds?: string[] }) =>
      catalogueApi.copyToProject(companyId, projectId, selection),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.properties(companyId, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.modules(companyId, projectId) });
    },
  });
}

/**
 * Preview propagation (REQ-DOM-007). `enabled` is the opt-in: nothing is
 * fetched until the editor asks, and the query itself never mutates.
 */
export function useModulePropagationPreview(moduleId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.modulePropagation(moduleId ?? ''),
    queryFn: () => modulesApi.propagationPreview(moduleId ?? ''),
    enabled: moduleId !== undefined && enabled,
  });
}

/**
 * Apply the module to trackings already using it (REQ-DOM-007). Invalidates
 * trackings broadly: propagation touches an unknown set of them.
 */
export function usePropagateModule(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => modulesApi.propagate(moduleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['trackings'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.modulePropagation(moduleId) });
    },
  });
}

export function useProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.property(propertyId ?? ''),
    queryFn: () => propertiesApi.get(propertyId ?? ''),
    enabled: propertyId !== undefined,
  });
}

/**
 * Create a property inside a project (M1.16, REQ-DOM-003). Invalidates the
 * project's property list: the sidebar and the catalogue screen read it.
 */
export function useCreateProperty(companyId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PropertyCreateInput) => propertiesApi.create(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.properties(companyId, projectId) });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

/**
 * Create a module inside a project (M1.16, REQ-DOM-004). The project's module
 * list changes; the property list does not.
 */
export function useCreateModule(companyId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ModuleCreateInput) => modulesApi.create(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.modules(companyId, projectId) });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

/**
 * Update a property (REQ-DOM-003). Invalidates the property itself and every
 * property list: a rename or status change is visible in the lists too.
 */
export function useUpdateProperty(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PropertyUpdateInput) => propertiesApi.update(propertyId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.property(propertyId) });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useModule(moduleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.module(moduleId ?? ''),
    queryFn: () => modulesApi.get(moduleId ?? ''),
    enabled: moduleId !== undefined,
  });
}

/**
 * Update a module (REQ-DOM-004). A changed property set can alter which
 * trackings resolve which properties, so tracking reads are invalidated too.
 */
export function useUpdateModule(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ModuleUpdateInput) => modulesApi.update(moduleId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.module(moduleId) });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['trackings'] });
    },
  });
}

export function useDestinations(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.destinations(companyId ?? ''),
    queryFn: () => destinationsApi.list(companyId ?? ''),
    enabled: companyId !== undefined,
  });
}

export function useDestination(destinationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.destination(destinationId ?? ''),
    queryFn: () => destinationsApi.get(destinationId ?? ''),
    enabled: destinationId !== undefined,
  });
}

/** Update a destination (REQ-DOM-005). */
export function useUpdateDestination(destinationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DestinationUpdateInput) => destinationsApi.update(destinationId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.destination(destinationId) });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useTrackingTemplates(companyId: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: queryKeys.trackingTemplates(companyId ?? '', projectId),
    queryFn: () => trackingTemplatesApi.list(companyId ?? '', projectId),
    enabled: companyId !== undefined,
  });
}

export function useTrackingTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trackingTemplate(templateId ?? ''),
    queryFn: () => trackingTemplatesApi.get(templateId ?? ''),
    enabled: templateId !== undefined,
  });
}

/**
 * Update a template (REQ-DOM-009). Deliberately does NOT invalidate trackings:
 * editing a template must not change trackings already created from it.
 */
export function useUpdateTrackingTemplate(templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TrackingTemplateUpdateInput) =>
      trackingTemplatesApi.update(templateId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackingTemplate(templateId) });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

/**
 * Duplicate a tracking (REQ-AUTH-006). The copy is fully independent, so only
 * the project's tracking list changes — the source tracking is untouched.
 */
export function useDuplicateTracking(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { trackingId: string; nameOverride?: string }) =>
      trackingsApi.duplicate(input.trackingId, input.nameOverride),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackings(projectId) });
    },
  });
}
