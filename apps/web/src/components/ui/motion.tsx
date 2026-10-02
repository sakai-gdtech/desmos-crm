"use client";

import { animate } from "motion/mini";
import { spring } from "motion";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";

const ease = [0.16, 1, 0.3, 1] as const;
type MotionRun = { cancel: () => void };
type Play = (
  element: Element,
  frames: Keyframe[],
  options: KeyframeAnimationOptions,
  name: string,
) => MotionRun | undefined;
const MotionContext = createContext<Play>(() => undefined);
export const useMotionPlayer = () => useContext(MotionContext);

/** Motion.dev owns JS movement; cancellation restores visible authored styles. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const active = useRef(new Set<MotionRun>());
  const play = useCallback<Play>((element, frames, options, name) => {
    if (
      !element.isConnected ||
      document.hidden ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !(element instanceof HTMLElement) ||
      !element.getClientRects().length ||
      typeof element.animate !== "function"
    )
      return;
    const rect = element.getBoundingClientRect();
    if (
      rect.bottom < 0 ||
      rect.top > innerHeight ||
      rect.right < 0 ||
      rect.left > innerWidth
    )
      return;
    const transform = frames.map((frame) => String(frame.transform ?? "none"));
    const original = element.style.transform;
    const control = animate(
      element,
      { transform },
      {
        duration: Number(options.duration ?? 280) / 1000,
        delay: Number(options.delay ?? 0) / 1000,
        ...(name === "layout" || name === "panel"
          ? { type: spring, bounce: 0 }
          : { ease }),
      },
    );
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      control.cancel();
      element.style.transform = original;
      active.current.delete(animation);
    };
    const animation: MotionRun = { cancel: release };
    element.dataset.motionEngine = "motion.dev";
    active.current.add(animation);
    control.then(release);
    return animation;
  }, []);
  useEffect(() => {
    const animations = active.current;
    const cancel = () => {
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    };
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => {
      if (preference.matches) cancel();
    };
    const visibility = () => {
      if (document.hidden) cancel();
    };
    preference.addEventListener("change", changed);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      preference.removeEventListener("change", changed);
      document.removeEventListener("visibilitychange", visibility);
      cancel();
    };
  }, []);
  return (
    <MotionContext.Provider value={play}>{children}</MotionContext.Provider>
  );
}

/** Native dialogs and the global chat share one finite, interruptible entry. */
export function usePanelMotion<T extends HTMLElement>(
  ref: RefObject<T | null>,
  open: boolean,
  kind: "dialog" | "panel" = "panel",
) {
  const play = useMotionPlayer();
  useEffect(() => {
    if (!open || !ref.current) return;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const transform =
      kind === "dialog"
        ? "translateY(18px) scale(0.98)"
        : mobile
          ? "translateY(24px)"
          : "translateX(-48px)";
    const run = play(
      ref.current,
      [{ transform }, { transform: "translate(0, 0)" }],
      { duration: kind === "dialog" ? 260 : 320 },
      kind,
    );
    return () => run?.cancel();
  }, [ref, open, kind, play]);
}

export function useMotionEntry<T extends HTMLElement>(
  ref: RefObject<T | null>,
  key: string,
  kind: "context" | "feedback" | "step" = "context",
) {
  const play = useContext(MotionContext);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const distance = kind === "feedback" ? 10 : kind === "step" ? 24 : 20;
    const transform = window.matchMedia("(max-width: 760px)").matches
      ? `translateY(${distance}px)`
      : `translateX(${distance}px)`;
    const animation = play(
      element,
      [{ transform }, { transform: "translate(0, 0)" }],
      { duration: kind === "feedback" ? 220 : 280 },
      kind,
    );
    return () => animation?.cancel();
  }, [ref, key, kind, play]);
}

/** Animate a result set, never each static card or every render. Max 340ms total. */
export function MotionCollection({
  as = "div",
  motionKey,
  newOnly = false,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: "div" | "tbody" | "ul" | "ol" | "dl";
  motionKey: string;
  newOnly?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(new WeakSet<Element>());
  const play = useContext(MotionContext);
  useEffect(() => {
    const animations: MotionRun[] = [];
    const children = Array.from(ref.current?.children ?? []);
    const items = children
      .filter(
        (node) =>
          node instanceof HTMLElement &&
          node.getClientRects().length > 0 &&
          (!newOnly || !seen.current.has(node)),
      )
      .slice(0, 6);
    children.forEach((element) => seen.current.add(element));
    items.forEach((element, index) => {
      const animation = play(
        element,
        [{ transform: "translateY(12px)" }, { transform: "translateY(0)" }],
        { duration: 240, delay: index * 20 },
        "collection",
      );
      if (animation) animations.push(animation);
    });
    return () => animations.forEach((animation) => animation.cancel());
  }, [motionKey, newOnly, play]);
  return createElement(
    as,
    { ...props, ref, "data-motion-collection": "" },
    children,
  );
}

/** Capture only before a deliberate layout operation; batch reads then writes. */
export function useLayoutMotion<T extends HTMLElement>(
  ref: RefObject<T | null>,
  signature: string,
) {
  const play = useContext(MotionContext);
  const previous = useRef(new Map<string, { x: number; y: number }>());
  const pending = useRef(false);
  const running = useRef<MotionRun[]>([]);
  const measure = useCallback(() => {
    const root = ref.current;
    const positions = new Map<string, { x: number; y: number }>();
    if (!root) return positions;
    const origin = root.getBoundingClientRect();
    root
      .querySelectorAll<HTMLElement>("[data-motion-key]")
      .forEach((element) => {
        const rect = element.getBoundingClientRect();
        positions.set(element.dataset.motionKey!, {
          x: rect.left - origin.left + root.scrollLeft,
          y: rect.top - origin.top + root.scrollTop,
        });
      });
    return positions;
  }, [ref]);
  const capture = useCallback(() => {
    previous.current = measure();
    pending.current = true;
  }, [measure]);
  useLayoutEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    running.current.forEach((animation) => animation.cancel());
    running.current = [];
    const current = measure();
    let count = 0;
    ref.current
      ?.querySelectorAll<HTMLElement>("[data-motion-key]")
      .forEach((element) => {
        const before = previous.current.get(element.dataset.motionKey!);
        const after = current.get(element.dataset.motionKey!);
        if (!after || count >= 20) return;
        const x = before ? before.x - after.x : 0;
        const y = before ? before.y - after.y : 18;
        if (Math.abs(x) < 1 && Math.abs(y) < 1) return;
        const animation = play(
          element,
          [
            { transform: `translate(${x}px, ${y}px)` },
            { transform: "translate(0, 0)" },
          ],
          { duration: 320 },
          "layout",
        );
        if (animation) {
          running.current.push(animation);
          count++;
        }
      });
    previous.current = current;
  }, [signature, ref, measure, play]);
  useEffect(
    () => () => running.current.forEach((animation) => animation.cancel()),
    [],
  );
  return capture;
}
