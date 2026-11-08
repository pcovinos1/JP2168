export const PROJECT_ID = "javier-prado-oeste-2168";
export const PROJECT_NAME = "Javier Prado Oeste 2168";
export const PROJECT_ARCHIVE = `${PROJECT_ID}-project.json`;

export function assertProjectIdentity(project: { id?: string }): void {
  if (project.id !== PROJECT_ID) {
    throw new Error(`El contenido no pertenece a ${PROJECT_NAME}.`);
  }
}
