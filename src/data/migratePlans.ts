import type { Project, Typology } from "../types/project";
import plans from "./jp2168Plans.json";
import { PROJECT_ID } from "./projectIdentity";

const legacyRevisions = ["jp2168-planos-2026-11-08", "jp2168-planos-2026-11-11"];
const legacyPaths = ["content/plans/jp2168-2026-11/", "content/plans/jp2168-2026-11-11/"];
const retiredTypology = "jp-duplex-x-09";
const retiredFloors = /^jp-piso-(2|3|14|15|16)$/;
const sourceNote = /^Fuente: (PLANOS-JP|planos-finales-jp)\.pdf, página \d+\. Áreas y dimensiones referenciales según ficha\.$/;

function isLegacyAsset(src: string): boolean {
  return legacyPaths.some(path => src.startsWith(path));
}

function refreshAsset(src: string, replacement: string): string {
  return isLegacyAsset(src) ? replacement : src;
}

export function migratePlans(project: Project): Project {
  if (project.id !== PROJECT_ID || project.plansRevision === plans.plansRevision) return project;
  if (legacyRevisions.some(revision => revision === project.plansRevision)) {
    const localTypologies = new Map(project.typologies.map(plan => [plan.id, plan]));
    const typologies = (plans.typologies as Typology[]).flatMap(plan => {
      const local = localTypologies.get(plan.id);
      if (!local) {
        return ["jp-flat-201", "jp-duplex-1402"].includes(plan.id) ? [structuredClone(plan)] : [];
      }
      localTypologies.delete(plan.id);
      return [{
        ...local,
        areaM2: plan.areaM2,
        planSrc: refreshAsset(local.planSrc, plan.planSrc),
        thumbnailSrc: refreshAsset(local.thumbnailSrc, plan.thumbnailSrc),
        floorThumbnailSrc: refreshAsset(local.floorThumbnailSrc, plan.floorThumbnailSrc),
        notes: !local.notes || sourceNote.test(local.notes) ? plan.notes : local.notes
      }];
    });
    typologies.push(...[...localTypologies.values()].filter(plan =>
      plan.id !== retiredTypology || !isLegacyAsset(plan.planSrc)
    ));

    const generalPlans = (project.generalPlans ?? []).filter(plan =>
      !retiredFloors.test(plan.id) || !isLegacyAsset(plan.planSrc)
    ).map(plan => {
      const current = plans.generalPlans.find(candidate => candidate.id === plan.id);
      if (!current) return plan;
      return {
        ...plan,
        planSrc: refreshAsset(plan.planSrc, current.planSrc),
        thumbnailSrc: refreshAsset(plan.thumbnailSrc, current.thumbnailSrc)
      };
    });

    return {
      ...project,
      typologies,
      generalPlans,
      floorPlan: { ...project.floorPlan, imageSrc: refreshAsset(project.floorPlan.imageSrc, plans.floorPlan.imageSrc) },
      areaRange: plans.areaRange,
      typologySummary: plans.typologySummary,
      plansRevision: plans.plansRevision
    };
  }
  const inherited = project.typologies.some(plan => plan.planSrc.includes("content/plans/bustamante"));
  if (project.typologies.length && !inherited) return project;
  return { ...project, ...structuredClone(plans) as Pick<Project,
    "typologies" | "generalPlans" | "floorPlan" | "areaRange" | "typologySummary" | "plansRevision"> };
}
