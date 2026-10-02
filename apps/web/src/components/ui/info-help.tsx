"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";

export function InfoHelp({
  title,
  children,
  disabled = false,
}: {
  title: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const place = () => {
    if (!trigger.current || !popup.current) return;
    const r = trigger.current.getBoundingClientRect();
    const viewport = window.visualViewport;
    const x = viewport?.offsetLeft ?? 0,
      y = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? innerWidth,
      height = viewport?.height ?? innerHeight;
    const w = Math.min(320, width - 32);
    const below = Math.max(0, y + height - r.bottom - 16),
      above = Math.max(0, r.top - y - 16);
    popup.current.style.width = `${w}px`;
    popup.current.style.left = `${Math.max(x + 16, Math.min(r.right - w, x + width - w - 16))}px`;
    const natural = popup.current.scrollHeight || 180;
    const upward = below < natural && above > below;
    const maxHeight = Math.max(40, upward ? above : below);
    popup.current.style.maxHeight = `${maxHeight}px`;
    popup.current.style.top = `${upward ? r.top - Math.min(natural, maxHeight) - 8 : r.bottom + 8}px`;
  };
  useEffect(() => {
    if (!open) return;
    place();
    document.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    window.visualViewport?.addEventListener("resize", place);
    return () => {
      document.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("resize", place);
    };
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="info-help-trigger"
        aria-label={`Informações: ${title}`}
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        popoverTarget={id}
        disabled={disabled}
      >
        <Info size={16} aria-hidden="true" />
      </button>
      <div
        ref={popup}
        id={id}
        popover="auto"
        role="note"
        aria-label={title}
        className="info-help-popover"
        onBeforeToggle={(e) => {
          if (e.newState === "open") place();
        }}
        onToggle={(e) => setOpen(e.newState === "open")}
      >
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </>
  );
}
