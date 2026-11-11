import type { Gallery, PointOfInterest, Project } from "../types/project";

const media = (name: string) => `${import.meta.env.BASE_URL}content/location/${name}.webp`;

// JP2168 brochure photography and Morada’s Basadre 1101 façade photograph.
const story: Gallery = {
  id: "entorno",
  title: "Descubre San Isidro",
  category: "barrio",
  images: [
    { id: "jp-dining", title: "Gastronomía", description: "Restaurante en San Isidro", src: media("gastronomia"), category: "barrio" },
    { id: "jp-culture", title: "Arte y cultura", description: "Toulouse Lautrec, escuela de diseño", src: media("cultura"), category: "barrio" },
    { id: "jp-architecture", title: "Arquitectura", description: "Detalle de la fachada de Basadre 1101, San Isidro", src: media("arquitectura"), category: "barrio" },
    { id: "jp-outdoors", title: "Espacios abiertos", description: "Parque de San Isidro", src: media("espacios"), category: "barrio" }
  ]
};

export const neighborhoodMapSrc = media("mapa");
export const neighborhoodProjectPosition = { x: 55.53, y: 51.21 };

const map: Gallery = {
  id: "barrio",
  title: "Mapa de San Isidro",
  category: "barrio",
  images: [{ id: "jp-neighborhood-map", title: "Mapa de San Isidro", src: neighborhoodMapSrc, category: "barrio" }]
};

// Legend and marker centers from “El barrio”, p. 7 of the September JP2168 brochure.
// Coordinates are percentages of the embedded artwork, before any viewport fitting.
const locations: Array<[string, PointOfInterest["category"], number, number]> = [
  ["ISIL San Isidro", "Educación", 56.12, 44.05],
  ["Universidad Señor de Sipán", "Educación", 60.47, 30.29],
  ["Universidad Cayetano Heredia", "Educación", 64.82, 21.70],
  ["Escuela de Postgrado UTP", "Educación", 66.82, 17.62],
  ["Toulouse Lautrec", "Educación", 3.88, 47.25],
  ["Scotiabank", "Bancos", 56.24, 23.79],
  ["Interbank", "Bancos", 58.71, 19.27],
  ["BCP", "Bancos", 61.18, 14.65],
  ["BBVA", "Bancos", 63.88, 10.24],
  ["Banco de la Nación", "Bancos", 36.35, 3.41],
  ["Parque Alfonso Ugarte", "Parques", 91.29, 58.04],
  ["Parque Residencial San Felipe", "Parques", 21.29, 10.57],
  ["Parque José de Acosta", "Parques", 8, 87.89],
  ["Clínica Sanna El Golf", "Salud", 67.06, 85.35],
  ["Fiorini", "Gastronomía", 50.94, 64.21],
  ["La P’tite France", "Gastronomía", 58.24, 63.44],
  ["Modonese Gourmet", "Gastronomía", 66.24, 64.98],
  ["Sofá Café", "Gastronomía", 15.88, 43.28],
  ["Vista Corona Lima", "Gastronomía", 14.35, 51.87],
  ["San Antonio", "Gastronomía", 6.12, 54.30],
  ["Paprika Restaurante", "Gastronomía", 29.41, 74.56],
  ["4D", "Gastronomía", 29.18, 82.38],
  ["La Baguette", "Gastronomía", 23.76, 78.74],
  ["Il Pastificio Classic", "Gastronomía", 17.88, 75.99],
  ["D’Sala Café", "Gastronomía", 12.12, 73.24],
  ["Perroquet", "Gastronomía", 93.76, 79.74],
  ["La Bonbonniere", "Gastronomía", 77.65, 12.56],
  ["Shimaya Ramen", "Gastronomía", 46.71, 4.07],
  ["Real Plaza Salaverry", "Tiendas", 54, 15.20],
  ["Metro", "Tiendas", 10.24, 8.15],
  ["Vivanda", "Tiendas", 10.24, 39.32],
  ["Bivo Sano", "Tiendas", 16.35, 47.91],
  ["Smart Fit", "Gimnasios", 15.76, 38.88],
  ["Aarmy Gym", "Gimnasios", 38.47, 32.49],
  ["Boost Studio", "Gimnasios", 12, 46.92]
];

export function migrateNeighborhood(project: Project): Project {
  const existingMap = project.galleries.find(gallery => gallery.id === "barrio");
  const existingStory = project.galleries.find(gallery => gallery.id === "entorno");
  const existingMapImage = existingMap?.images[0];
  const legacyMap = existingMapImage?.title === "mapa-pardo664" &&
    existingMapImage.updatedAt === "2026-08-10T20:01:43.695Z";
  const needsMap = !existingMap?.images.length || legacyMap;
  const needsStory = !existingStory?.images.length;
  if (!needsMap && !needsStory) return project;

  const galleries = project.galleries.filter(gallery =>
    !(needsMap && gallery.id === "barrio") && !(needsStory && gallery.id === "entorno")
  );
  if (needsStory) galleries.push(structuredClone(story));
  if (needsMap) galleries.push({ ...map, images: [...structuredClone(map.images), ...(existingMap?.images.slice(1) ?? [])] });

  return {
    ...project,
    galleries,
    pointsOfInterest: needsMap
      ? locations.map(([name, category, x, y], index) => ({ id: `jp-poi-${index + 1}`, name, category, x, y, visible: true, order: index + 1 }))
      : project.pointsOfInterest
  };
}
