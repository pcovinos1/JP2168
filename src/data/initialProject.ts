import plans from "./jp2168Plans.json";
import type { Project } from "../types/project";

const today = "2026-11-08";
const fallbackImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 1000'%3E%3Crect width='1600' height='1000' fill='%23f5efe7'/%3E%3Ctext x='800' y='500' dominant-baseline='middle' text-anchor='middle' fill='%231d1b18' font-family='Arial' font-size='72'%3EJavier Prado Oeste 2168%3C/text%3E%3C/svg%3E";

export const initialProject: Project = {
  id: "javier-prado-oeste-2168",
  name: "Javier Prado Oeste 2168",
  developer: "Morada",
  logoText: "morada",
  tagline: "Un proyecto de Morada",
  shortDescription: "Proyecto residencial de Morada.",
  district: "Por confirmar",
  address: "Javier Prado Oeste 2168",
  architect: "Morada",
  certification: "Por confirmar",
  status: "En venta",
  sharedAreas: [],
  leedAttributes: [],
  about: {
    eyebrow: "Morada",
    title: "Javier Prado Oeste 2168",
    subtitle: "Proyecto residencial de Morada.",
    coverImageSrc: fallbackImage,
    slides: [],
    projects: []
  },
  sections: [
    { id: "project", title: "El proyecto", summary: "Javier Prado Oeste 2168 por Morada.", order: 1, enabled: true },
    { id: "architecture", title: "Arquitectura", summary: "Arquitectura residencial de Morada.", order: 2, enabled: true },
    { id: "location", title: "Ubicación", summary: "Entorno de Javier Prado Oeste 2168.", order: 3, enabled: true },
    { id: "amenities", title: "Areas comunes", summary: "Espacios compartidos.", order: 4, enabled: true },
    { id: "interiors", title: "Interiores", summary: "Interiores del proyecto.", order: 5, enabled: true },
    { id: "departments", title: "Departamentos", summary: "Tipologias disponibles.", order: 6, enabled: true },
    { id: "contact", title: "Contacto", summary: "Informacion comercial.", order: 7, enabled: true }
  ],
  galleries: [
    {
      id: "fachada",
      title: "Fachada",
      category: "fachada",
      images: [{ id: "fachada-fallback", title: "Javier Prado Oeste 2168", src: fallbackImage, category: "fachada" }]
    }
  ],
  pointsOfInterest: [],
  version: {
    version: "1.0",
    publishedAt: today,
    changes: [{ id: "fallback", date: today, text: "Contenido base de Javier Prado Oeste 2168." }]
  },
  ...plans as Pick<Project, "typologies" | "generalPlans" | "floorPlan" | "areaRange" | "typologySummary" | "plansRevision">,
  adminPin: "6640"
};
