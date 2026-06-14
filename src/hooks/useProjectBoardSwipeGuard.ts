import { useEffect, type RefObject } from "react";

/**
 * Prevents two-finger horizontal trackpad / shift-wheel gestures from triggering
 * browser back/forward on the project kanban page.
 */
export function useProjectBoardSwipeGuard(
  enabled: boolean,
  boardRef: RefObject<HTMLDivElement | null>,
  topRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    document.documentElement.classList.add("project-kanban-page");
    document.body.classList.add("project-kanban-page");
    return () => {
      document.documentElement.classList.remove("project-kanban-page");
      document.body.classList.remove("project-kanban-page");
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function isHorizontalIntent(event: WheelEvent): boolean {
      return (
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        (event.shiftKey && event.deltaY !== 0)
      );
    }

    function resolveDelta(event: WheelEvent): number {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return event.deltaX;
      if (event.shiftKey && event.deltaY !== 0) return event.deltaY;
      return 0;
    }

    function onWheel(event: WheelEvent) {
      if (!isHorizontalIntent(event)) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.closest(".task-column-body") &&
        Math.abs(event.deltaY) >= Math.abs(event.deltaX) &&
        !event.shiftKey
      ) {
        return;
      }

      event.preventDefault();

      const board = boardRef.current;
      const delta = resolveDelta(event);
      if (!board || delta === 0) return;

      const maxScroll = board.scrollWidth - board.clientWidth;
      if (maxScroll <= 0) return;

      const next = Math.max(0, Math.min(maxScroll, board.scrollLeft + delta));
      if (next === board.scrollLeft) return;

      board.scrollLeft = next;
      const top = topRef.current;
      if (top) top.scrollLeft = next;
    }

    document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () =>
      document.removeEventListener("wheel", onWheel, { capture: true });
  }, [enabled, boardRef, topRef]);
}
