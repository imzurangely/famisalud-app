import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import "../../styles/ScrollArea.css";

const DIRECTIONS = {
  y: "overflow-y-auto overflow-x-hidden",
  x: "overflow-x-auto overflow-y-hidden",
  both: "overflow-auto",
};

const ScrollArea = forwardRef(function ScrollArea(
  {
    as: Component = "div",
    direction = "y",
    maxHeight,
    fade = true,
    className = "",
    style,
    children,
    ...props
  },
  forwardedRef,
) {
  const innerRef = useRef(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  useImperativeHandle(forwardedRef, () => innerRef.current);

  const updateEdges = useCallback(() => {
    const node = innerRef.current;
    if (!node || !fade || direction === "x") return;
    const top = node.scrollTop > 2;
    const bottom = node.scrollTop + node.clientHeight < node.scrollHeight - 2;
    setEdges((prev) =>
      prev.top === top && prev.bottom === bottom ? prev : { top, bottom },
    );
  }, [fade, direction]);

  useEffect(() => {
    const node = innerRef.current;
    if (!node) return undefined;
    updateEdges();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node);
    Array.from(node.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [updateEdges, children]);

  const mask =
    fade && direction !== "x" && (edges.top || edges.bottom)
      ? `linear-gradient(to bottom, ${edges.top ? "transparent 0, #000 18px" : "#000 0"}, ${edges.bottom ? "#000 calc(100% - 18px), transparent 100%" : "#000 100%"})`
      : undefined;

  return (
    <Component
      ref={innerRef}
      onScroll={updateEdges}
      className={`scroll-area ${DIRECTIONS[direction] || DIRECTIONS.y} ${className}`}
      style={{
        ...(maxHeight ? { maxHeight } : null),
        ...(mask ? { WebkitMaskImage: mask, maskImage: mask } : null),
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
});

export default ScrollArea;