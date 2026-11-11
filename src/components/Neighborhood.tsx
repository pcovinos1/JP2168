import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Hand, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { neighborhoodMapSrc, neighborhoodProjectPosition } from "../data/neighborhood";
import type { Project } from "../types/project";
import { NeighborhoodMap } from "./NeighborhoodMap";
import "../styles/neighborhood.css";

export function Neighborhood({ project }: { project: Project }) {
  const photos = project.galleries.find(gallery => gallery.id === "entorno")?.images ?? [];
  const map = project.galleries.find(gallery => gallery.id === "barrio")?.images[0];
  const projectPosition = map?.src === neighborhoodMapSrc ? neighborhoodProjectPosition : undefined;
  const [screen, setScreen] = useState(0);
  const [photoId, setPhotoId] = useState("jp-outdoors");
  const [showHint, setShowHint] = useState(true);
  const [filter, setFilter] = useState("Todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const gesture = useRef<{ id: number; x: number; y: number }>();
  const action = useRef<HTMLButtonElement>(null);
  const isStory = screen === 0;
  const active = photos.find(photo => photo.id === photoId) ?? photos[0];
  const activeIndex = photos.findIndex(photo => photo.id === active?.id);
  const allPoints = project.pointsOfInterest.filter(point => point.visible).sort((a, b) => a.order - b.order);
  const categories = ["Todos", ...new Set(allPoints.map(point => point.category))];
  const points = allPoints.filter(point => filter === "Todos" || point.category === filter);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowHint(false), 6500);
    return () => window.clearTimeout(timer);
  }, []);

  function changeScreen(next: number) {
    if (next === screen) return;
    if (document.activeElement instanceof HTMLElement && document.activeElement.closest(".jp-neighborhood")) {
      action.current?.focus({ preventScroll: true });
    }
    setScreen(next);
    setShowHint(false);
    gesture.current = undefined;
  }

  function stepPhoto(direction: number) {
    setPhotoId(photos[(activeIndex + direction + photos.length) % photos.length].id);
  }

  return (
    <section
      className="jp-neighborhood"
      aria-label="El barrio"
      data-screen={screen}
      onPointerDown={event => {
        if (!event.isPrimary) {
          gesture.current = undefined;
          return;
        }
        gesture.current = undefined;
        if (event.button !== 0 || !(event.target instanceof Element) ||
            event.target.closest("[data-neighborhood-map], button, a, select, input")) return;
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }}
      onPointerUp={event => {
        const start = gesture.current;
        if (start?.id !== event.pointerId) return;
        gesture.current = undefined;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) < 58 || Math.abs(dx) < Math.abs(dy) * 1.45) return;
        if (isStory && dx < 0) changeScreen(1);
        if (!isStory && dx > 0) changeScreen(0);
      }}
      onPointerCancel={() => { gesture.current = undefined; }}
      onPointerLeave={() => { gesture.current = undefined; }}
    >
      <div className="jp-neighborhood-window">
        <div className="jp-neighborhood-track">
          <article className="jp-story" aria-hidden={!isStory} ref={node => { if (node) node.inert = !isStory; }}>
            <div className="jp-story-photos">
              {photos.map(photo => (
                <img key={photo.id} src={photo.src} alt={photo.description || photo.title} draggable={false} aria-hidden={photo !== active} data-current={photo === active} />
              ))}
            </div>
            <div className="jp-story-shade" />
            <p className="jp-neighborhood-kicker jp-story-kicker">El barrio <span /> San Isidro</p>
            {photos.length > 1 && (
              <div className="jp-photo-arrows">
                <button type="button" aria-label="Fotografía anterior" onClick={() => stepPhoto(-1)}><ChevronLeft size={22} /></button>
                <button type="button" aria-label="Fotografía siguiente" onClick={() => stepPhoto(1)}><ChevronRight size={22} /></button>
              </div>
            )}
            {active?.description && <p className="jp-story-caption">{active.description}</p>}
            <div className="jp-story-copy">
              <h1>San Isidro, parte<br className="jp-story-break" /> de nuestra esencia.</h1>
              <p>Entre arquitectura, áreas verdes y una vibrante vida urbana, descubre un entorno que conecta lo mejor de San Isidro.</p>
            </div>
            {photos.length > 0 && (
              <div className="jp-filmstrip" role="group" aria-label="Fotografías del entorno">
                {photos.map(photo => (
                  <button key={photo.id} type="button" aria-pressed={photo === active} onClick={() => setPhotoId(photo.id)}>
                    <img src={photo.src} alt="" draggable={false} />
                    <span>{photo.title}</span>
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="jp-environment" aria-hidden={isStory} ref={node => { if (node) node.inert = isStory; }}>
            <div className="jp-environment-copy">
              <p className="jp-neighborhood-kicker">El entorno <span /> San Isidro</p>
              <h2>Todo cerca de tu morada.</h2>
              <p className="jp-environment-lead">Descubre los espacios y lugares que forman parte de tu día a día en San Isidro.</p>
              {categories.length > 1 && (
                <div className="jp-map-filters" role="group" aria-label="Categorías del entorno">
                  {categories.map(category => (
                    <button type="button" key={category} aria-pressed={filter === category}
                      onClick={() => { setFilter(category); setSelectedId(null); }}>
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {map ? (
              <NeighborhoodMap key={map.src} src={map.src} address={project.address} projectPosition={projectPosition}
                points={points} selectedId={selectedId} onSelect={setSelectedId} />
            ) : <p className="jp-map-empty">Mapa no disponible.</p>}
          </article>
        </div>
      </div>
      <footer className="jp-neighborhood-footer">
        <div className="jp-neighborhood-progress" aria-live="polite" aria-atomic="true">
          <p><strong>{isStory ? "01" : "02"}</strong> / 02</p>
          <span>{isStory ? "Descubre San Isidro" : "Explora el entorno"}</span>
          <div aria-hidden="true"><i /><i /></div>
        </div>
        <div className="jp-swipe-hint" data-visible={isStory && showHint} aria-hidden={!isStory || !showHint}>
          <span aria-hidden="true"><ArrowLeft size={15} /><Hand size={19} /></span>
          <p>Desliza hacia la izquierda para explorar el mapa</p>
        </div>
        {isStory && map && (
          <button type="button" className="jp-map-preview" aria-label="Abrir vista previa del mapa del entorno" onClick={() => changeScreen(1)}>
            <img src={map.src} alt="" draggable={false} />
            {projectPosition && <MapPin size={18} style={{ left: `${projectPosition.x}%`, top: `${projectPosition.y}%` }} />}
          </button>
        )}
        <button ref={action} className="jp-neighborhood-action" type="button" onClick={() => changeScreen(isStory ? 1 : 0)}>
          {!isStory && <ArrowLeft size={18} />} {isStory ? "Ver mapa del entorno" : "Volver a la galería"} {isStory && <ArrowRight size={18} />}
        </button>
      </footer>
    </section>
  );
}
