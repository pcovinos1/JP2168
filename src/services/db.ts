import { migrateNeighborhood } from "../data/neighborhood";
import { PROJECT_ID, assertProjectIdentity } from "../data/projectIdentity";
import { openDB } from "idb";
import type { Project } from "../types/project";
import { initialProject } from "../data/initialProject";
import { fetchRemoteProject } from "./files";
import { migratePlans } from "../data/migratePlans";

const DB_NAME = `${PROJECT_ID}-local`;
const STORE = "project";
const PROJECT_KEY = "active";

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE);
  }
});

export async function getProject(): Promise<Project> {
  const db = await safeDb();
  if (!db) return fetchRemoteProject().catch(() => null).then((project) => migrateNeighborhood(migratePlans(project ?? initialProject)));

  const saved = await db.get(STORE, PROJECT_KEY).catch(() => undefined);
  if (saved && saved.id === PROJECT_ID) {
    const normalized = migrateNeighborhood(migratePlans(normalizeProject(saved as Project)));
    await db.put(STORE, normalized, PROJECT_KEY).catch(() => undefined);
    return normalized;
  }
  const published = await fetchRemoteProject().catch(() => null);
  const project = migrateNeighborhood(migratePlans(published ?? initialProject));
  await db.put(STORE, project, PROJECT_KEY).catch(() => undefined);
  return project;
}

export async function saveProject(project: Project): Promise<void> {
  assertProjectIdentity(project);
  const db = await safeDb();
  if (!db) throw new Error("IndexedDB no está disponible.");
  await db.put(STORE, project, PROJECT_KEY);
}

export async function savePublishedProject(project: Project, replaceLocal: boolean): Promise<boolean> {
  assertProjectIdentity(project);
  const db = await safeDb();
  if (!db) return true;
  const transaction = db.transaction(STORE, "readwrite");
  const current = await transaction.store.get(PROJECT_KEY) as Project | undefined;
  if (!current?.localEditedAt || replaceLocal) await transaction.store.put(project, PROJECT_KEY);
  await transaction.done;
  return !current?.localEditedAt || replaceLocal;
}

export async function resetProject(): Promise<Project> {
  const db = await safeDb();
  const project = migrateNeighborhood(migratePlans(initialProject));
  await db?.put(STORE, project, PROJECT_KEY).catch(() => undefined);
  return project;
}

async function safeDb() {
  if (!("indexedDB" in window)) return null;
  return dbPromise.catch(() => null);
}

function normalizeProject(project: Project): Project {
  const logoSrc = typeof project.logoSrc === "string" ? project.logoSrc : initialProject.logoSrc;
  const about = project.about
    ? {
        ...initialProject.about,
        ...project.about,
        slides: project.about.slides?.length ? project.about.slides : initialProject.about.slides,
        projects: project.about.projects?.length
          ? project.about.projects.map((item, index) => ({
              ...item,
              year: typeof item.year === "string" && item.year ? item.year : "2020",
              order: typeof item.order === "number" ? item.order : index + 1
            }))
          : initialProject.about.projects
      }
    : initialProject.about;
  const galleries = [...project.galleries];
  for (const gallery of initialProject.galleries) {
    if (!galleries.some((item) => item.id === gallery.id)) {
      galleries.push(gallery);
    }
  }
  const normalizedGalleries = galleries;

  if (!normalizedGalleries.some(g => g.id === "entorno")) normalizedGalleries.push({ id: "entorno", title: "Descubre San Isidro", category: "barrio", images: [] });

  const sections = [...project.sections];
  for (const section of initialProject.sections) {
    if (!sections.some((item) => item.id === section.id)) {
      sections.push(section);
    }
  }

  const mergedPoints = [...project.pointsOfInterest];
  for (const point of initialProject.pointsOfInterest) {
    if (!mergedPoints.some((item) => item.id === point.id)) {
      mergedPoints.push(point);
    }
  }

  const initialPointsById = new Map(initialProject.pointsOfInterest.map((point) => [point.id, point]));
  const pointsOfInterest = mergedPoints
    .map((point, index) => {
      const initialPoint = initialPointsById.get(point.id);
      const rawCategory = String(point.category);
      return {
        ...point,
        category: rawCategory === "Cafés" ? "Gastronomía" : (initialPoint?.category ?? point.category),
        visible: typeof point.visible === "boolean" ? point.visible : true,
        order: typeof point.order === "number" ? point.order : index + 1
      };
    })
    .sort((a, b) => a.order - b.order);

  return { ...project, logoSrc, about, galleries: normalizedGalleries, sections, pointsOfInterest };
}
