import type { Project } from "../types/project";
import plans from "./jp2168Plans.json";
import { PROJECT_ID } from "./projectIdentity";

// Replace only the inherited catalogue, once. Preserve other local content and
// subsequent edits to JP2168 plans, including user-created zones.
export function migratePlans(project: Project): Project {
  if (project.id !== PROJECT_ID || project.plansRevision === plans.plansRevision) return project;
  const inherited = project.typologies.some(plan => plan.planSrc.includes("content/plans/bustamante"));
  if (project.typologies.length && !inherited) return project;
  return { ...project, ...structuredClone(plans) as Pick<Project,
    "typologies" | "generalPlans" | "floorPlan" | "areaRange" | "typologySummary" | "plansRevision"> };
}
