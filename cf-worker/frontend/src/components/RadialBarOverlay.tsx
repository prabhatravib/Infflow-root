import { createPortal } from "react-dom";

interface RadialBarOverlayProps {
  children: React.ReactNode;
}

export function RadialBarOverlay({ children }: RadialBarOverlayProps) {
  return createPortal(
    <div id="radial-stage-bar">
      <div className="search-bar">{children}</div>
    </div>,
    document.body
  );
}
