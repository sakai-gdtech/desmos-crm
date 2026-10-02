"use client";

import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

type Option = {
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
};
type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "multiple" | "size"
>;

function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? text(child.props.children)
        : String(child),
    )
    .join("");
}

function optionsOf(
  children: ReactNode,
  group?: string,
  disabled = false,
): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        children?: ReactNode;
        value?: string | number;
        label?: string;
        disabled?: boolean;
      }>(child)
    )
      return [];
    if (child.type === Fragment)
      return optionsOf(child.props.children, group, disabled);
    if (child.type === "optgroup")
      return optionsOf(
        child.props.children,
        child.props.label,
        disabled || !!child.props.disabled,
      );
    if (child.type !== "option") return [];
    const content = text(child.props.children).trim();
    return [
      {
        value: String(child.props.value ?? content),
        label: child.props.label ?? content,
        disabled: disabled || !!child.props.disabled,
        group,
      },
    ];
  });
}

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");

/** Shared single-choice control. The hidden select only bridges form/ref APIs;
 * all pointer, keyboard and assistive-technology interaction uses the combobox. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      children,
      className,
      id,
      value,
      defaultValue,
      disabled,
      required,
      autoFocus,
      tabIndex,
      onChange,
      onBlur,
      onFocus,
      onKeyDown,
      onInvalid,
      style,
      ...props
    },
    forwardedRef,
  ) {
    const generated = useId();
    const triggerId = id ?? `${generated}-select`;
    const listId = `${generated}-options`;
    const native = useRef<HTMLSelectElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const popup = useRef<HTMLDivElement>(null);
    const typeahead = useRef({ query: "", at: 0 });
    const options = useMemo(() => optionsOf(children), [children]);
    const [current, setCurrent] = useState(
      String(
        value ?? defaultValue ?? options.find((o) => !o.disabled)?.value ?? "",
      ),
    );
    const selected = value === undefined ? current : String(value);
    const selectedIndex = options.findIndex((o) => o.value === selected);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [host, setHost] = useState<HTMLElement | null>(null);
    const [position, setPosition] = useState({
      left: 0,
      top: 0,
      width: 0,
      maxHeight: 320,
    });
    const canPopover =
      host !== null && typeof HTMLElement.prototype.showPopover === "function";

    const attachNative = useCallback(
      (node: HTMLSelectElement | null) => {
        native.current = node;
        // RHF focuses its registered ref on validation failure. Route that focus to
        // the visible control while preserving the real select's value/form contract.
        if (node) node.focus = (options) => trigger.current?.focus(options);
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    useLayoutEffect(() => {
      if (value === undefined && native.current)
        setCurrent(native.current.value);
    });
    useEffect(() => {
      const form = native.current?.form;
      let frame = 0;
      const reset = () => {
        setOpen(false);
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() =>
          setCurrent(native.current?.value ?? ""),
        );
      };
      form?.addEventListener("reset", reset);
      return () => {
        form?.removeEventListener("reset", reset);
        cancelAnimationFrame(frame);
      };
    }, []);

    const close = useCallback(() => {
      setOpen(false);
      typeahead.current = { query: "", at: 0 };
    }, []);
    const choose = (index: number) => {
      const option = options[index];
      if (!option || option.disabled || disabled || !native.current) return;
      if (native.current.value !== option.value) {
        native.current.value = option.value;
        // A real change retains target.name, RHF and controlled select behavior.
        native.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
      close();
    };
    const show = (
      index = selectedIndex >= 0 && !options[selectedIndex].disabled
        ? selectedIndex
        : options.findIndex((o) => !o.disabled),
    ) => {
      if (disabled) return;
      const button = trigger.current;
      if (!button) return;
      setHost(
        button.closest<HTMLElement>("dialog[open], main, aside, header, nav") ??
          document.body,
      );
      setActive(index);
      setOpen(true);
    };

    useLayoutEffect(() => {
      if (!open || disabled || !host || !trigger.current || !popup.current)
        return;
      const button = trigger.current;
      const menu = popup.current;
      let positionFrame = 0;
      const place = () => {
        const r = button.getBoundingClientRect();
        const viewport = window.visualViewport;
        const x = viewport?.offsetLeft ?? 0,
          y = viewport?.offsetTop ?? 0;
        const width = viewport?.width ?? innerWidth,
          height = viewport?.height ?? innerHeight;
        const below = Math.max(0, y + height - r.bottom - 14),
          above = Math.max(0, r.top - y - 14);
        const menuWidth = Math.min(Math.max(r.width, 200), width - 16);
        // Measure after width is applied: wrapped labels and touch targets can
        // be taller than a nominal row. This keeps upward menus off the trigger.
        menu.style.width = `${menuWidth}px`;
        const natural = Math.min(320, menu.scrollHeight);
        const upward = below < natural && above > below;
        const maxHeight = Math.max(40, Math.min(320, upward ? above : below));
        let left = Math.max(x + 8, Math.min(r.left, x + width - menuWidth - 8));
        let top = upward
          ? r.top - Math.min(natural, maxHeight) - 6
          : r.bottom + 6;
        // Older browsers use a portal in the same modal instead of the top layer.
        if (!canPopover && host?.tagName === "DIALOG") {
          const h = host.getBoundingClientRect();
          left -= h.left + host.clientLeft;
          top += host.scrollTop - h.top - host.clientTop;
        }
        setPosition({ left, top, width: menuWidth, maxHeight });
      };
      if (canPopover && !menu.matches(":popover-open")) menu.showPopover();
      place();
      const outside = (event: PointerEvent) => {
        if (
          !menu.contains(event.target as Node) &&
          !button.contains(event.target as Node)
        )
          close();
      };
      const scroll = (event: Event) => {
        if (!menu.contains(event.target as Node) && !positionFrame) {
          positionFrame = requestAnimationFrame(() => {
            positionFrame = 0;
            place();
          });
        }
      };
      const modalClosed = () => close();
      const visibility = () => {
        if (document.hidden) close();
      };
      document.addEventListener("pointerdown", outside, true);
      document.addEventListener("scroll", scroll, true);
      document.addEventListener("visibilitychange", visibility);
      host.addEventListener("close", modalClosed);
      window.addEventListener("resize", place);
      window.visualViewport?.addEventListener("resize", place);
      return () => {
        cancelAnimationFrame(positionFrame);
        if (canPopover && menu.matches(":popover-open")) menu.hidePopover();
        document.removeEventListener("pointerdown", outside, true);
        document.removeEventListener("scroll", scroll, true);
        document.removeEventListener("visibilitychange", visibility);
        host.removeEventListener("close", modalClosed);
        window.removeEventListener("resize", place);
        window.visualViewport?.removeEventListener("resize", place);
      };
    }, [open, disabled, host, canPopover, options, close]);

    useEffect(() => {
      if (disabled) close();
    }, [disabled, close]);
    useLayoutEffect(() => {
      if (!open) return;
      const row = document.getElementById(`${listId}-${active}`);
      const menu = popup.current;
      if (!row || !menu) return;
      // Scroll only the popup, never the page or its modal ancestors.
      if (row.offsetTop < menu.scrollTop) menu.scrollTop = row.offsetTop;
      else if (
        row.offsetTop + row.offsetHeight >
        menu.scrollTop + menu.clientHeight
      )
        menu.scrollTop = row.offsetTop + row.offsetHeight - menu.clientHeight;
    }, [open, active, listId, position.maxHeight]);

    const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      const enabled = options
        .map((o, index) => ({ ...o, index }))
        .filter((o) => !o.disabled);
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.isDefaultPrevented() ||
        event.nativeEvent.isComposing
      )
        return;
      const from = open ? active : selectedIndex;
      if (event.altKey && event.key === "ArrowUp" && open) {
        event.preventDefault();
        choose(active);
        return;
      }
      if (event.altKey && event.key === "ArrowDown") {
        event.preventDefault();
        if (!open) show();
        return;
      }
      if (
        ["ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"].includes(
          event.key,
        )
      ) {
        event.preventDefault();
        const step = event.key === "ArrowUp" || event.key === "PageUp" ? -1 : 1;
        let index = enabled.findIndex((o) => o.index === from);
        if (event.key === "Home") index = 0;
        else if (event.key === "End") index = enabled.length - 1;
        else if (open)
          index = Math.max(
            0,
            Math.min(
              enabled.length - 1,
              index + step * (event.key.startsWith("Page") ? 10 : 1),
            ),
          );
        else index = Math.max(0, index);
        if (open) setActive(enabled[index]?.index ?? -1);
        else show(enabled[index]?.index ?? -1);
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (open) choose(active);
        else show();
      } else if (event.key === "Tab" && open) {
        choose(active);
      } else if (event.key.length === 1 && !event.altKey) {
        event.preventDefault();
        const now = Date.now();
        const query =
          now - typeahead.current.at < 700
            ? typeahead.current.query + normalize(event.key)
            : normalize(event.key);
        const repeated = [...query].every((c) => c === query[0]);
        const match = repeated ? query[0] : query;
        const start = repeated
          ? enabled.findIndex((o) => o.index === from) + 1
          : 0;
        const rotated = [...enabled.slice(start), ...enabled.slice(0, start)];
        const found = rotated.find((o) => normalize(o.label).startsWith(match));
        typeahead.current = { query, at: now };
        if (open) {
          if (found) setActive(found.index);
        } else show(found?.index);
      }
    };

    const menu = (
      <div
        ref={popup}
        id={listId}
        role="listbox"
        aria-label="Opções disponíveis"
        popover={canPopover ? "manual" : undefined}
        className="select-popup"
        data-placement={
          position.top < (trigger.current?.getBoundingClientRect().top ?? 0)
            ? "above"
            : "below"
        }
        style={{
          ...position,
          position:
            !canPopover && host?.tagName === "DIALOG" ? "absolute" : "fixed",
        }}
        onPointerDown={(event) => {
          // Preserve combobox focus through a tap; panning remains native via
          // touch-action, and click still performs the actual selection.
          event.preventDefault();
        }}
      >
        {options.length === 0 && (
          <div className="select-empty">Nenhuma opção disponível</div>
        )}
        {options.map((option, index) => (
          <Fragment key={`${option.value}-${index}`}>
            {option.group && option.group !== options[index - 1]?.group && (
              <div className="select-group">{option.group}</div>
            )}
            <div
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === selected}
              aria-disabled={option.disabled || undefined}
              data-value={option.value}
              data-active={index === active || undefined}
              className="select-option"
              onPointerMove={(event) => {
                if (event.pointerType === "mouse" && !option.disabled)
                  setActive(index);
              }}
              onClick={() => {
                choose(index);
                trigger.current?.focus({ preventScroll: true });
              }}
            >
              <span>{option.label}</span>
              {option.value === selected && (
                <Check size={15} aria-hidden="true" />
              )}
            </div>
          </Fragment>
        ))}
      </div>
    );

    return (
      <>
        <select
          {...props}
          ref={attachNative}
          hidden
          aria-hidden="true"
          aria-label={undefined}
          aria-labelledby={undefined}
          tabIndex={-1}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          onChange={(event) => {
            setCurrent(event.currentTarget.value);
            onChange?.(event);
          }}
          onBlur={onBlur}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          onInvalid={(event) => {
            event.preventDefault();
            trigger.current?.focus();
            onInvalid?.(event);
          }}
        >
          {children}
        </select>
        <button
          ref={trigger}
          type="button"
          id={triggerId}
          role="combobox"
          aria-label={props["aria-label"]}
          aria-labelledby={props["aria-labelledby"]}
          aria-describedby={props["aria-describedby"]}
          aria-invalid={props["aria-invalid"]}
          aria-required={required || undefined}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          aria-expanded={open}
          aria-activedescendant={
            open && active >= 0 ? `${listId}-${active}` : undefined
          }
          data-value={selected}
          value={selected}
          title={props.title}
          className={["input select", className].filter(Boolean).join(" ")}
          style={style}
          disabled={disabled}
          autoFocus={autoFocus}
          tabIndex={tabIndex}
          onClick={() => {
            if (open) close();
            else show();
          }}
          onKeyDown={keyDown}
          onBlur={() => {
            close();
            native.current?.dispatchEvent(
              new FocusEvent("focusout", { bubbles: true }),
            );
          }}
          onFocus={() =>
            native.current?.dispatchEvent(
              new FocusEvent("focusin", { bubbles: true }),
            )
          }
        >
          <span className="select-value">
            {options[selectedIndex]?.label ?? "Selecione uma opção"}
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className="select-chevron"
          />
        </button>
        {open && !disabled && host && createPortal(menu, host)}
      </>
    );
  },
);
