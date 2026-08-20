import { create } from 'zustand';

/**
 * Current project context (ADR-0013). URL params remain the source of truth
 * for navigation; this store exists so components below the route level can
 * read "the current project id" without prop-drilling the route match.
 */
interface ProjectStore {
  currentProjectId: string | null;
  setCurrentProjectId: (projectId: string | null) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  currentProjectId: null,
  setCurrentProjectId: (currentProjectId) => {
    set({ currentProjectId });
  },
}));
