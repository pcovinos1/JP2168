import type { Project } from "../types/project";
import plans from "./jp2168Plans.json";
import { PROJECT_ID } from "./projectIdentity";

const previousRevision = "jp2168-planos-2026-11-08";
const previousAssetPath = "content/plans/jp2168-2026-11/";
const currentAssetPath = plans.floorPlan.imageSrc.slice(0, plans.floorPlan.imageSrc.lastIndexOf("/") + 1);

function refreshPlanAsset(src: string): string {
  return src.startsWith(previousAssetPath)
    ? currentAssetPath + src.slice(previousAssetPath.length)
    : src;
}

export function migratePlans(project: Project): Project {
  if (project.id !== PROJECT_ID || project.plansRevision === plans.plansRevision) return project;
  if (project.plansRevision === previousRevision) {
    const typologies = project.typologies.map(plan => ({
      ...plan,
      planSrc: refreshPlanAsset(plan.planSrc),
      thumbnailSrc: refreshPlanAsset(plan.thumbnailSrc),
      floorThumbnailSrc: refreshPlanAsset(plan.floorThumbnailSrc),
      notes: plan.notes?.replace(/^Fuente: PLANOS-JP\.pdf, página (\d+)\. Áreas y dimensiones referenciales según ficha\.$/, "Fuente: planos-finales-jp.pdf, página $1. Áreas y dimensiones referenciales según ficha.")
    }));
    const generalPlans = (project.generalPlans ?? []).map(plan => ({
      ...plan,
      planSrc: refreshPlanAsset(plan.planSrc),
      thumbnailSrc: refreshPlanAsset(plan.thumbnailSrc)
    }));
    const addedFloors = plans.generalPlans.filter(plan =>
      /^jp-piso-(2|3|14|15|16)$/.test(plan.id) && !generalPlans.some(local => local.id === plan.id)
    );
    const roofIndex = generalPlans.findIndex(plan => plan.id === "jp-azotea");
    generalPlans.splice(roofIndex < 0 ? generalPlans.length : roofIndex, 0, ...structuredClone(addedFloors));
    return {
      ...project,
      typologies,
      generalPlans,
      floorPlan: { ...project.floorPlan, imageSrc: refreshPlanAsset(project.floorPlan.imageSrc) },
      plansRevision: plans.plansRevision
    };
  }
  const inherited = project.typologies.some(plan => plan.planSrc.includes("content/plans/bustamante"));
  if (project.typologies.length && !inherited) return project;
  return { ...project, ...structuredClone(plans) as Pick<Project,
    "typologies" | "generalPlans" | "floorPlan" | "areaRange" | "typologySummary" | "plansRevision"> };
}
