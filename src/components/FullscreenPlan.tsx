import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useId, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { PlanViewer } from "./PlanViewer";

interface Props {
  src: string;
  title: string;
  onClose: () => void;
  onMove?: (direction: -1 | 1) => void;
  toolbarActions?: ReactNode;
}

export function FullscreenPlan({ src, title, onClose, onMove, toolbarActions }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const modal = dialog.current!;
    const opener = document.activeElement;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    modal.showModal();
    root.style.overflow = "hidden";
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      modal.close();
      root.style.overflow = overflow;
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-white p-0 text-ink open:flex"
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (!onMove || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
        event.preventDefault();
        onMove(event.key === "ArrowLeft" ? -1 : 1);
      }}
    >
      <PlanViewer
        src={src}
        title={`Plano ${title}`}
        toolbar={
          <div className="flex min-w-0 grow items-center justify-between gap-2">
            <h2 id={titleId} className="min-w-0 text-base font-semibold sm:text-xl" aria-live="polite">{title}</h2>
            <div className="flex shrink-0 items-center gap-1">
              {toolbarActions}
              {onMove && (
                <>
                  <button className="icon-button" type="button" onClick={() => onMove(-1)} aria-label="Anterior" title="Anterior">
                    <ChevronLeft className="size-5" />
                  </button>
                  <button className="icon-button" type="button" onClick={() => onMove(1)} aria-label="Siguiente" title="Siguiente">
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}
              <button ref={closeButton} className="icon-button" type="button" onClick={onClose} aria-label="Cerrar plano" title="Cerrar plano">
                <X className="size-5" />
              </button>
            </div>
          </div>
        }
      />
    </dialog>
  );
}
