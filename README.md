# Javier Prado Oeste 2168 | Morada

Presentación comercial independiente basada en la experiencia UX/UI de Bustamante 175.
El repositorio de trabajo es `pcovinos1/JP2168`; no se modifica el proyecto original.

## Estado del contenido

La identidad técnica está aislada. Los renders, mapa, puntos de interés y textos comerciales siguen pendientes de validación y reemplazo.
El catálogo de planos corresponde a `planos-finales-jp.pdf` e incluye 14 tipologías y 12 planos generales.
Las áreas y dimensiones mantienen el carácter referencial indicado en las fichas.
Los planos se guardan en `public/content/plans/jp2168-2026-11-11/`.
En instalaciones existentes, la migración actualiza las imágenes del catálogo anterior y agrega los cinco pisos nuevos. Conserva las imágenes personalizadas, las zonas y los demás datos locales.
El distrito y la certificación del contenido inicial están pendientes de confirmación.

## Desarrollo y publicación

```sh
npm ci
npm run dev
npm run build:pages
npm run preview
```

El build de Pages usa `/JP2168/` por defecto. Puede configurarse con `PAGES_BASE_PATH`.
El workflow `.github/workflows/` compila y despliega `dist/` al enviar cambios a `main`.
En GitHub, Pages debe usar GitHub Actions como origen. La configuración remota y el despliegue
real deben verificarse en GitHub. URL prevista: https://pcovinos1.github.io/JP2168/

## Arquitectura

- `src/App.tsx`: vistas comerciales y administrador.
- `src/components/`: navegación, galería, planta con zonas porcentuales y visor con zoom.
- `src/context/ProjectContext.tsx`: estado y sincronización del contenido publicado.
- `src/data/projectIdentity.ts`: identidad y validación de pertenencia.
- `src/data/initialProject.ts`: contenido mínimo de respaldo.
- `public/content/project.json`: contenido maestro publicado.
- `src/services/db.ts`: IndexedDB exclusiva de JP2168.
- `src/services/files.ts`: exportación, importación y sincronización.
- `public/sw.js`: caché exclusiva de JP2168, limitada a su ruta.
- `scripts/generate-offline-manifest.mjs`: precache y revisión del worker por contenido del build.

La navegación usa estado React, sin rutas profundas. El mapa usa una imagen local con puntos
porcentuales y filtros. No requiere una API cartográfica. Las zonas de la planta deben
configurarse sobre los planos definitivos de JP2168.

## Offline y actualizaciones

Usar producción por HTTPS o localhost; el servidor de desarrollo no instala el service worker.
Abrir con conexión y esperar la instalación completa antes de desconectar.
El precache incluye los archivos publicados; los cambios del administrador se guardan en
IndexedDB. La sincronización consulta versiones al iniciar, recuperar conexión, enfocar la app
y cada 60 segundos. Solo se acepta el ID `javier-prado-oeste-2168`.

El administrador conserva el PIN inicial `6640`. Permite exportar un ZIP propio con
`javier-prado-oeste-2168-project.json` o descargar `project.json` para reemplazar el maestro
publicado. Los ZIP de otros proyectos se rechazan. Los cambios locales no se suben a GitHub
automáticamente. Al publicar contenido nuevo se debe incrementar la versión.

Cada build genera una revisión de caché. El worker elimina únicamente revisiones antiguas
con el prefijo de JP2168 y no lee ni elimina cachés de otros proyectos. La copia anterior de
Bustamante puede seguir teniendo su propia lógica de limpieza global: este repositorio no
puede corregirla sin modificar aquel proyecto.

## Verificación

```sh
npm run build:pages
node scripts/check-plan-catalog.mjs
node scripts/check-project-isolation.mjs
```

Antes de usar en ventas: probar instalación y recarga sin conexión, mapa, galerías, planos,
exportación/importación, actualizaciones y convivencia con el sitio original en el navegador.
