"use client";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { DealDetail } from "./deals";
export function DealDrawer({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const title = useId();
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (id && !dialog.open) {
      returnFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.showModal();
    }
    if (!id && dialog.open) dialog.close();
    if (!id) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [id]);
  const close = () => {
    ref.current?.close();
    if (returnFocus.current?.isConnected)
      returnFocus.current.focus({ preventScroll: true });
    onClose();
  };
  return (
    <dialog
      ref={ref}
      className="deal-drawer"
      aria-labelledby={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close();
        }
      }}
    >
      <div className="drawer-heading">
        <h2 id={title}>Detalhes do negócio</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Fechar negócio"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      <div className="drawer-content">
        {id && <DealDetail key={id} id={id} embedded onClose={close} />}
      </div>
    </dialog>
  );
}
