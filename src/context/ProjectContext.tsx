import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProject, saveProject } from "../services/db";
import { fetchRemoteProject } from "../services/files";
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
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const next = await getProject();
    setProject(next);
    setLoading(false);
    void fetchRemoteProject(next)
      .then(async (remote) => {
        if (!remote || next.localEditedAt) return;
        await saveProject(remote);
        setProject(remote);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateProject = useCallback(async (updater: Project | ((project: Project) => Project)) => {
    if (!project) return;
    const next = typeof updater === "function" ? updater(project) : updater;
    const local = { ...next, localEditedAt: new Date().toISOString() };
    await saveProject(local);
    setProject(local);
  }, [project]);

  const syncFromRemote = useCallback(async (replaceLocal = false) => {
    const current = await getProject();
    const remote = await fetchRemoteProject(replaceLocal ? undefined : current);
    if (!remote || (current.localEditedAt && !replaceLocal)) return null;
    await saveProject(remote);
    setProject(remote);
    return remote;
  }, []);

  useEffect(() => {
    const syncWhenOnline = () => {
      if (navigator.onLine) void syncFromRemote().catch(() => undefined);
    };
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") syncWhenOnline();
    };
    const interval = window.setInterval(syncWhenOnline, 60_000);
    window.addEventListener("online", syncWhenOnline);
    window.addEventListener("focus", syncWhenOnline);
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", syncWhenOnline);
      window.removeEventListener("focus", syncWhenOnline);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [syncFromRemote]);

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
