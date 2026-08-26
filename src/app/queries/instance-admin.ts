import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { instanceAdminApi, type StepUpOpenInput } from '../api';

import { queryKeys } from './keys';

/** Open step-up windows held by the current instance administrator (ADR-0027). */
export function useStepUps(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.stepUps(),
    queryFn: () => instanceAdminApi.listStepUps(),
    enabled,
  });
}

export function useOpenStepUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StepUpOpenInput) => instanceAdminApi.openStepUp(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.stepUps() });
    },
  });
}
