"use client";

import { useRef, useCallback, useState, useEffect } from "react";

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  side: "left" | "right";
}

export function ResizablePanel({
  children,
  defaultWidth,
  minWidth,
  maxWidth,
  side,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;
      startX.current = e.clientX;
      startW.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const multiplier = side === "left" ? delta : -delta;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startW.current + multiplier));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [minWidth, maxWidth, side]);

  const isLeft = side === "left";

  if (collapsed) {
    return (
      <button
        className={`absolute ${isLeft ? "left-0" : "right-0"} top-1/2 -translate-y-1/2 z-20 w-5 h-12 bg-white border border-border shadow-md rounded-${isLeft ? "r" : "l"} flex items-center justify-center text-xs hover:bg-gray-50`}
        onClick={() => setCollapsed(false)}
        title={isLeft ? "展开左侧面板" : "展开右侧面板"}
      >
        {isLeft ? "▶" : "◀"}
      </button>
    );
  }

  return (
    <>
      {/* Panel */}
      <div
        className={`absolute top-0 bottom-0 ${isLeft ? "left-0" : "right-0"} z-20 bg-surface shadow-lg flex flex-col`}
        style={{ width }}
      >
        {/* Collapse button */}
        <button
          className={`absolute top-3 ${isLeft ? "right-1" : "right-1"} z-30 w-5 h-5 flex items-center justify-center text-[10px] text-text-muted hover:text-text bg-white/80 rounded`}
          onClick={() => setCollapsed(true)}
          title="折叠面板"
        >
          {isLeft ? "◀" : "▶"}
        </button>

        {children}
      </div>

      {/* Resize handle at inner edge (right edge for left panel, left edge for right panel) */}
      <div
        className="absolute top-0 bottom-0 z-30 w-4 cursor-col-resize group flex justify-center"
        style={{ [isLeft ? "left" : "right"]: isLeft ? width - 2 : width - 2 }}
        onMouseDown={onMouseDown}
      >
        <div className="w-0.5 h-full bg-transparent group-hover:bg-primary/50 group-active:bg-primary transition-colors rounded" />
      </div>
    </>
  );
}
