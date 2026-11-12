import { LocateFixed, Minus, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { PointOfInterest } from "../types/project";

type Position = { x: number; y: number };
type Camera = Position & { zoom: number };

const overview = { x: 50, y: 50, zoom: 1 };
const maxZoom = 4;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function measurePinch([first, second]: Position[]) {
  return {
    distance: Math.hypot(first.x - second.x, first.y - second.y),
    center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
  };
}

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
  const touches = useRef(new Map<number, Position>());
  const pinch = useRef<{ distance: number; center: Position; camera: Camera }>();
  const suppressClick = useRef(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [camera, renderCamera] = useState(overview);
  const currentCamera = useRef(overview);
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

  function setCamera(next: Camera) {
    currentCamera.current = next;
    renderCamera(next);
  }

  function zoom(factor: number) {
    const current = currentCamera.current;
    const zoom = clamp(current.zoom * factor, 1, maxZoom);
    setCamera(zoom === 1 ? overview : { ...current, zoom });
  }

  function pan(x: number, y: number, start: Camera) {
    setCamera({ x: clamp(start.x - x, 0, 100), y: clamp(start.y - y, 0, 100), zoom: start.zoom });
  }

  function startPointer(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !fit) return;
    const position = { x: event.clientX, y: event.clientY };
    const active = touches.current;
    if (event.pointerType === "touch") {
      if (active.size >= 2) return;
      active.set(event.pointerId, position);
      if (active.size === 2) {
        pinch.current = { ...measurePinch([...active.values()]), camera: currentCamera.current };
        drag.current = undefined;
        suppressClick.current = true;
        for (const id of active.keys()) event.currentTarget.setPointerCapture(id);
        setDragging(true);
        return;
      }
    }
    if (!event.isPrimary || drag.current) return;
    suppressClick.current = false;
    drag.current = { id: event.pointerId, start: position, camera: currentCamera.current, moved: false };
  }

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    const active = touches.current;
    if (active.has(event.pointerId)) {
      active.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const start = pinch.current;
      if (start) {
        const next = measurePinch([...active.values()]);
        if (start.distance < 1) {
          pinch.current = { ...next, camera: currentCamera.current };
          return;
        }
        const scale = clamp(start.camera.zoom * next.distance / start.distance, 1, maxZoom);
        if (scale === 1) {
          setCamera(overview);
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = rect.left + viewport.width / 2;
        const centerY = rect.top + viewport.height / 2;
        const width = natural.width * fit;
        const height = natural.height * fit;
        setCamera({
          x: clamp(start.camera.x + 100 * ((start.center.x - centerX) / start.camera.zoom - (next.center.x - centerX) / scale) / width, 0, 100),
          y: clamp(start.camera.y + 100 * ((start.center.y - centerY) / start.camera.zoom - (next.center.y - centerY) / scale) / height, 0, 100),
          zoom: scale
        });
        return;
      }
    }

    const start = drag.current;
    if (start?.id !== event.pointerId) return;
    const dx = event.clientX - start.start.x;
    const dy = event.clientY - start.start.y;
    if (!start.moved) {
      if (Math.hypot(dx, dy) < 6) return;
      start.moved = true;
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    pan(dx / (natural.width * fit * start.camera.zoom) * 100, dy / (natural.height * fit * start.camera.zoom) * 100, start.camera);
  }

  function stopPointer(event: PointerEvent<HTMLDivElement>) {
    const active = touches.current;
    if (active.delete(event.pointerId) && pinch.current) {
      pinch.current = undefined;
      for (const [id, start] of active) {
        drag.current = { id, start, camera: currentCamera.current, moved: true };
        return;
      }
    }
    if (drag.current?.id === event.pointerId) drag.current = undefined;
    if (!drag.current) setDragging(false);
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
        onPointerDown={startPointer}
        onPointerMove={movePointer}
        onPointerUp={stopPointer}
        onPointerLeave={event => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) stopPointer(event);
        }}
        onLostPointerCapture={event => {
          if (event.target === event.currentTarget) stopPointer(event);
        }}
        onPointerCancel={stopPointer}
        onClickCapture={event => {
          if (suppressClick.current && event.detail > 0) event.stopPropagation();
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
