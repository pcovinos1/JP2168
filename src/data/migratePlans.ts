import type { Project } from "../types/project";

// JP2168 owns its catalogue. Never inject plans from another development.
export function migratePlans(project: Project): Project {
  return project;
}
