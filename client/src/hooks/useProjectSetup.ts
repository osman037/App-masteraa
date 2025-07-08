import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface SetupResult {
  success: boolean;
  message: string;
  details: {
    dependencies: boolean;
    missingFiles: boolean;
    sdkSetup: boolean;
    buildTools: boolean;
  };
}

export function useProjectSetup() {
  const queryClient = useQueryClient();

  const setupMutation = useMutation<SetupResult, Error, number>({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest(`/api/projects/${projectId}/setup`, {
        method: 'POST',
      });
      return response.json();
    },
    onSuccess: (data, projectId) => {
      // Invalidate project queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      console.error('Setup failed:', error);
    },
  });

  return {
    setupProject: setupMutation.mutateAsync,
    isSettingUp: setupMutation.isPending,
    setupResult: setupMutation.data,
    setupError: setupMutation.error,
  };
}