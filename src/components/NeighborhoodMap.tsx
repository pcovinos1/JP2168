import { LocateFixed, Minus, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { PointOfInterest } from "../types/project";

type Position = { x: number; y: number };
type Camera = Position & { zoom: number };

const overview = { x: 50, y: 50, zoom: 1 };
const maxZoom = 4;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface Props {
  src: string;
  address: string;
  projectPosition?: Position;
  points: PointOfInterest[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function NeighborhoodMap({ src, address, projectPosition, points, selectedId, onSelect }: Props) {
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; start: Position; camera: Camera; moved: boolean }>();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState(overview);
  const [dragging, setDragging] = useState(false);
  const fit = natural.width && natural.height
    ? Math.min(Math.max(0, viewport.width - 32) / natural.width, Math.max(0, viewport.height - 32) / natural.height)
    : 0;
  const width = natural.width * fit * camera.zoom;
  const height = natural.height * fit * camera.zoom;
  const left = viewport.width / 2 - width * camera.x / 100;
  const top = viewport.height / 2 - height * camera.y / 100;
  const selected = points.find(point => point.id === selectedId);
  const projectSelected = selectedId === "project";

  useEffect(() => {
    if (!canvas.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewport({ width, height });
    });
    observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);

  function zoom(factor: number) {
    setCamera(current => {
      const zoom = clamp(current.zoom * factor, 1, maxZoom);
      return zoom === 1 ? overview : { ...current, zoom };
    });
  }

  function pan(x: number, y: number, start: Camera) {
    setCamera({ x: clamp(start.x - x, 0, 100), y: clamp(start.y - y, 0, 100), zoom: start.zoom });
  }

  function pinStyle(point: Position) {
    return { left: left + width * point.x / 100, top: top + height * point.y / 100 };
  }

  function selectPoint(event: MouseEvent<HTMLButtonElement>, point: PointOfInterest) {
    let id = point.id;
    if (event.detail > 0 && canvas.current) {
      // Adjacent pins can share part of their 44 px touch targets at the overview zoom.
      const rect = canvas.current.getBoundingClientRect();
      let distance = Infinity;
      for (const candidate of points) {
        const position = pinStyle(candidate);
        if (position.left < 0 || position.left > viewport.width || position.top < 0 || position.top > viewport.height) continue;
        const dx = Math.abs(rect.left + position.left - event.clientX);
        const dy = Math.abs(rect.top + position.top - event.clientY);
        const offset = Math.hypot(dx, dy);
        if (dx <= 22 && dy <= 22 && offset < distance) {
          id = candidate.id;
          distance = offset;
        }
      }
    }
    onSelect(selectedId === id ? null : id);
  }

  const projectPin = projectPosition && pinStyle(projectPosition);
  const isInFrame = ({ left, top }: { left: number; top: number }) =>
    left >= 0 && left <= viewport.width && top >= 0 && top <= viewport.height;

  return (
    <div className="jp-map" data-neighborhood-map>
      <div
        ref={canvas}
        className="jp-map-canvas"
        data-dragging={dragging}
        role="region"
        aria-label="Mapa interactivo de San Isidro"
        tabIndex={0}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0 || !width || !height) return;
          drag.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, camera, moved: false };
        }}
        onPointerMove={event => {
          const start = drag.current;
          if (start?.id !== event.pointerId) return;
          const dx = event.clientX - start.start.x;
          const dy = event.clientY - start.start.y;
          if (!start.moved) {
            if (Math.hypot(dx, dy) < 6) return;
            start.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }
          pan(dx / width * 100, dy / height * 100, start.camera);
        }}
        onPointerUp={event => {
          if (drag.current?.id !== event.pointerId) return;
          drag.current = undefined;
          setDragging(false);
        }}
        onPointerLeave={event => {
          if (drag.current?.id === event.pointerId && !drag.current.moved) drag.current = undefined;
        }}
        onLostPointerCapture={event => {
          if (event.target === event.currentTarget && drag.current?.id === event.pointerId) {
            drag.current = undefined;
            setDragging(false);
          }
        }}
        onPointerCancel={() => {
          drag.current = undefined;
          setDragging(false);
        }}
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          const step = 8 / camera.zoom;
          switch (event.key) {
            case "ArrowLeft": pan(step, 0, camera); break;
            case "ArrowRight": pan(-step, 0, camera); break;
            case "ArrowUp": pan(0, step, camera); break;
            case "ArrowDown": pan(0, -step, camera); break;
            case "+": case "=": zoom(1.4); break;
            case "-": zoom(1 / 1.4); break;
            case "Home": setCamera(overview); break;
            default: return;
          }
          event.preventDefault();
        }}
      >
        <img
          className="jp-map-art"
          src={src}
          alt="Mapa ilustrado del entorno de Javier Prado Oeste 2168"
          draggable={false}
          style={{ width, height, left, top }}
          onLoad={event => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            setNatural({ width: naturalWidth, height: naturalHeight });
          }}
        />
        {width > 0 && points.map(point => {
          const position = pinStyle(point);
          const inFrame = isInFrame(position);
          return (
            <button className="jp-map-point" key={point.id} type="button" style={position}
              tabIndex={inFrame ? 0 : -1} aria-hidden={!inFrame}
              aria-label={point.name} aria-pressed={selectedId === point.id}
              onClick={event => selectPoint(event, point)}>
              <span>{point.order}</span>
            </button>
          );
        })}
        {width > 0 && projectPin && (
          <button className="jp-map-point jp-project-point" type="button" style={projectPin}
            tabIndex={isInFrame(projectPin) ? 0 : -1} aria-hidden={!isInFrame(projectPin)}
            aria-label={address} aria-pressed={projectSelected}
            onClick={() => onSelect(projectSelected ? null : "project")}>
            <strong>2168</strong>
          </button>
        )}
      </div>
      <div className="jp-map-controls" aria-label="Controles del mapa">
        <button type="button" aria-label="Ampliar mapa" onClick={() => zoom(1.4)} disabled={camera.zoom >= maxZoom}><Plus size={20} /></button>
        <button type="button" aria-label="Reducir mapa" onClick={() => zoom(1 / 1.4)} disabled={camera.zoom <= 1}><Minus size={20} /></button>
        <button type="button" aria-label="Restablecer vista del mapa" onClick={() => setCamera(overview)}><LocateFixed size={19} /></button>
      </div>
      <div className="jp-map-selection" aria-live="polite">
        {(selected || projectSelected) && (
          <div>
            <span>{selected ? selected.category : "Morada"}</span>
            <strong>{selected ? selected.name : address}</strong>
            <button type="button" aria-label="Cerrar información del lugar" onClick={() => onSelect(null)}><X size={17} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
