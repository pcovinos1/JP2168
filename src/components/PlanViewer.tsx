import { Minus, Plus, RotateCcw } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const centered = { x: 0, y: 0 };

export function PlanViewer({ src, title, toolbar }: { src: string; title: string; toolbar?: ReactNode }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState(centered);
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const image = useRef<HTMLImageElement>(null);

  function reset() {
    setZoom(1);
    setOffset(centered);
    drag.current = null;
  }

  useLayoutEffect(reset, [src]);

  function pan(x: number, y: number, scale = zoom) {
    const sheet = image.current;
    if (!sheet?.naturalWidth) return;
    const fit = Math.min(sheet.clientWidth / sheet.naturalWidth, sheet.clientHeight / sheet.naturalHeight);
    const limitX = Math.max(0, (sheet.naturalWidth * fit * scale - sheet.clientWidth) / 2);
    const limitY = Math.max(0, (sheet.naturalHeight * fit * scale - sheet.clientHeight) / 2);
    setOffset({
      x: Math.max(-limitX, Math.min(limitX, x)),
      y: Math.max(-limitY, Math.min(limitY, y))
    });
  }

  function changeZoom(delta: number) {
    const next = Math.max(1, Math.min(4, zoom + delta));
    setZoom(next);
    pan(offset.x, offset.y, next);
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
        onPointerDown={(event) => {
          if (zoom === 1 || event.button !== 0 || drag.current) return;
          drag.current = { pointerId: event.pointerId, x: event.clientX - offset.x, y: event.clientY - offset.y };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (start?.pointerId === event.pointerId) pan(event.clientX - start.x, event.clientY - start.y);
        }}
        onLostPointerCapture={(event) => {
          if (drag.current?.pointerId === event.pointerId) drag.current = null;
        }}
        onKeyDown={(event) => {
          if (zoom === 1) return;
          const direction = {
            ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]
          }[event.key];
          if (!direction) return;
          event.preventDefault();
          event.stopPropagation();
          pan(offset.x + direction[0] * 48, offset.y + direction[1] * 48);
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
