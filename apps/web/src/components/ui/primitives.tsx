"use client";

import {
  cloneElement,
  isValidElement,
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { errorMessage } from "@/lib/api";
import { useMotionEntry, usePanelMotion } from "./motion";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      variant = "primary",
      loading,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn("btn", `btn-${variant}`, className)}
        {...props}
      >
        {loading && <Loader2 aria-hidden="true" size={16} className="spin" />}
        {children}
      </button>
    );
  },
);
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn("input", className)} {...props} />;
});
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select ref={ref} className={cn("input select", className)} {...props} />
  );
});
export function Field({
  label,
  id,
  error,
  hint,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const control = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, {
        ...(error
          ? { "aria-invalid": true, "aria-describedby": `${id}-error` }
          : hint
            ? { "aria-describedby": `${id}-hint` }
            : {}),
      })
    : children;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control}
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
export function Alert({
  children,
  success = false,
}: {
  children: ReactNode;
  success?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useMotionEntry(
    ref,
    typeof children === "string" ? children : String(success),
    "feedback",
  );
  return (
    <div
      ref={ref}
      className={cn("alert", success && "alert-success")}
      role={success ? "status" : "alert"}
    >
      {success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{children}</span>
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "indigo" | "amber";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useMotionEntry(ref, title);
  return (
    <header ref={ref} className="page-heading" data-motion-context="">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}
export function LoadingPage() {
  return (
    <div className="loading-page" role="status" aria-label="Carregando">
      <Skeleton className="skeleton-title" />
      <Skeleton className="skeleton-text" />
      <div className="stats-grid">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="skeleton-card" />
        ))}
      </div>
      <Skeleton className="skeleton-body" />
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <Card className="empty-state">
      <AlertCircle size={30} />
      <h2>Não foi possível carregar</h2>
      <p>{errorMessage(error)}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Tentar novamente
        </Button>
      )}
    </Card>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    else if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  usePanelMotion(ref, open, "dialog");
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
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
            onClose();
        }
      }}
    >
      <div className="dialog-heading">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Fechar janela"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
