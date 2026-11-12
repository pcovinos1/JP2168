import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getProject, saveProject, savePublishedProject } from "../services/db";
import { fetchRemoteProject } from "../services/files";
import { canApplyPublishedUpdate } from "../services/publication";
import type { Project } from "../types/project";

interface ProjectContextValue {
  project: Project | null;
  loading: boolean;
  updateProject: (updater: Project | ((project: Project) => Project)) => Promise<void>;
  reload: () => Promise<void>;
  syncFromRemote: (replaceLocal?: boolean) => Promise<Project | null>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const activeProject = useRef<Project | null>(null);
  const syncing = useRef(false);
  const setProject = useCallback((next: Project) => {
    activeProject.current = next;
    setProjectState(next);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    const next = await getProject();
    setProject(next);
    setLoading(false);
  }, [setProject]);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateProject = useCallback(async (updater: Project | ((project: Project) => Project)) => {
    if (!project) return;
    const next = typeof updater === "function" ? updater(project) : updater;
    const local = { ...next, localEditedAt: new Date().toISOString() };
    await saveProject(local);
    setProject(local);
  }, [project, setProject]);

  const syncFromRemote = useCallback(async (replaceLocal = false) => {
    const current = activeProject.current;
    if (!current || syncing.current || !canApplyPublishedUpdate()) return null;
    syncing.current = true;
    try {
      const remote = await fetchRemoteProject(replaceLocal ? undefined : current, true);
      if (!remote || current !== activeProject.current || !canApplyPublishedUpdate()) return null;
      if (!await savePublishedProject(remote, current, replaceLocal)) return null;
      if (current === activeProject.current) setProject(remote);
      return remote;
    } finally {
      syncing.current = false;
    }
  }, [setProject]);

  useEffect(() => {
    if (loading) return;
    const syncWhenOnline = () => {
      if (navigator.onLine && document.visibilityState === "visible") void syncFromRemote().catch(() => undefined);
    };
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") syncWhenOnline();
    };
    const interval = window.setInterval(syncWhenOnline, 60_000);
    window.addEventListener("online", syncWhenOnline);
    window.addEventListener("focus", syncWhenOnline);
    window.addEventListener("pageshow", syncWhenOnline);
    document.addEventListener("visibilitychange", syncWhenVisible);
    syncWhenOnline();
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", syncWhenOnline);
      window.removeEventListener("focus", syncWhenOnline);
      window.removeEventListener("pageshow", syncWhenOnline);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [loading, syncFromRemote]);

  useEffect(() => {
    if (project) document.title = `${project.name} | ${project.developer}`;
  }, [project?.name, project?.developer]);

  const value = useMemo(() => ({ project, loading, updateProject, reload, syncFromRemote }), [project, loading, updateProject, reload, syncFromRemote]);
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject debe usarse dentro de ProjectProvider");
  return ctx;
}
