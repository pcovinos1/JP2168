import { Minus, Plus, RotateCcw } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";

type Point = { x: number; y: number };
const initialView = { zoom: 1, offset: { x: 0, y: 0 } };
const clampZoom = (value: number) => Math.max(1, Math.min(4, value));
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function PlanViewer({ src, title, toolbar }: { src: string; title: string; toolbar?: ReactNode }) {
  const [{ zoom, offset }, setView] = useState(initialView);
  const view = useRef(initialView);
  const pointers = useRef(new Map<number, Point>());
  const image = useRef<HTMLImageElement>(null);

  function reset() {
    view.current = initialView;
    setView(initialView);
    pointers.current.clear();
  }

  useLayoutEffect(reset, [src]);

  function moveView(x: number, y: number, scale: number) {
    const sheet = image.current;
    if (!sheet?.naturalWidth) return;
    const fit = Math.min(sheet.clientWidth / sheet.naturalWidth, sheet.clientHeight / sheet.naturalHeight);
    const limitX = Math.max(0, (sheet.naturalWidth * fit * scale - sheet.clientWidth) / 2);
    const limitY = Math.max(0, (sheet.naturalHeight * fit * scale - sheet.clientHeight) / 2);
    const next = {
      zoom: scale,
      offset: {
        x: Math.max(-limitX, Math.min(limitX, x)),
        y: Math.max(-limitY, Math.min(limitY, y))
      }
    };
    view.current = next;
    setView(next);
  }

  function changeZoom(delta: number) {
    const current = view.current;
    moveView(current.offset.x, current.offset.y, clampZoom(current.zoom + delta));
  }

  function trackPointer(event: PointerEvent<HTMLDivElement>) {
    const active = pointers.current;
    if (event.button !== 0 || active.size >= 2 || (active.size && event.pointerType !== "touch")) return;
    active.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    const active = pointers.current;
    const before = active.get(event.pointerId);
    if (!before) return;
    const after = { x: event.clientX, y: event.clientY };
    const other = [...active.entries()].find(([id]) => id !== event.pointerId)?.[1];
    active.set(event.pointerId, after);

    const current = view.current;
    if (!other) {
      if (current.zoom > 1) {
        moveView(current.offset.x + after.x - before.x, current.offset.y + after.y - before.y, current.zoom);
      }
      return;
    }

    const previousDistance = distance(before, other);
    const nextDistance = distance(after, other);
    if (previousDistance < 1 || nextDistance < 1) return;
    const scale = clampZoom(current.zoom * nextDistance / previousDistance);
    const ratio = scale / current.zoom;
    const previousCenter = midpoint(before, other);
    const nextCenter = midpoint(after, other);
    const bounds = event.currentTarget.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    // Keep the point under the two fingers in place as the image scales.
    moveView(
      nextCenter.x - centerX - (previousCenter.x - centerX - current.offset.x) * ratio,
      nextCenter.y - centerY - (previousCenter.y - centerY - current.offset.y) * ratio,
      scale
    );
  }

  function stopTracking(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
  }

  const controls = (
    <div className="flex shrink-0 gap-1" role="group" aria-label="Controles de zoom">
      <button className="icon-button disabled:opacity-40" onClick={() => changeZoom(0.25)} disabled={zoom === 4} type="button" aria-label="Acercar" title="Acercar">
        <Plus className="size-5" />
      </button>
      <button className="icon-button disabled:opacity-40" onClick={() => changeZoom(-0.25)} disabled={zoom === 1} type="button" aria-label="Alejar" title="Alejar">
        <Minus className="size-5" />
      </button>
      <button className="icon-button" onClick={reset} type="button" aria-label="Restablecer vista" title="Restablecer vista">
        <RotateCcw className="size-5" />
      </button>
    </div>
  );

  return (
    <div className={toolbar ? "flex min-h-0 flex-1 flex-col bg-white" : "relative flex min-h-[420px] flex-col overflow-hidden rounded border border-ink/10 bg-white"}>
      {toolbar ? (
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-ink/10 bg-paper px-3 py-1.5 sm:px-4">
          {toolbar}
          {controls}
        </header>
      ) : (
        <div className="absolute right-3 top-3 z-10 rounded-full bg-paper/90 p-2">{controls}</div>
      )}
      <div
        className={`relative min-h-0 flex-1 overflow-hidden touch-none ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
        tabIndex={toolbar ? 0 : undefined}
        role={toolbar ? "group" : undefined}
        aria-label={toolbar ? "Plano. Usa las flechas para desplazarlo al acercar." : undefined}
        onPointerDown={trackPointer}
        onPointerMove={movePointer}
        onPointerUp={stopTracking}
        onPointerCancel={stopTracking}
        onLostPointerCapture={stopTracking}
        onKeyDown={(event) => {
          if (zoom === 1) return;
          const direction = {
            ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]
          }[event.key];
          if (!direction) return;
          event.preventDefault();
          event.stopPropagation();
          moveView(offset.x + direction[0] * 48, offset.y + direction[1] * 48, zoom);
        }}
      >
        <img
          ref={image}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
          src={src}
          alt={title}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
          draggable={false}
        />
      </div>
    </div>
  );
}
