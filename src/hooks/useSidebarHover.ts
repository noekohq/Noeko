import { useRef } from "react";
import { useLayout } from "../contexts/LayoutContext";

type ISidebarMode = "open" | "collapsed" | "compact" | "hovering";

interface IUseSidebarHoverProps {
  mode: ISidebarMode;
  setMode: (mode: ISidebarMode) => void;
  openable: boolean;
}

const useSidebarHover = ({
  mode,
  setMode,
  openable,
}: IUseSidebarHoverProps) => {
  const applyingLayoutChange = useRef(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringOverGlobal = useRef(false);

  const { isDesktop } = useLayout();

  const sidebarProps = {
    onMouseEnter: () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        if (
          mode === "collapsed" &&
          !applyingLayoutChange.current &&
          !isHoveringOverGlobal.current &&
          openable &&
          isDesktop
        ) {
          setMode("hovering");
          applyingLayoutChange.current = true;
          setTimeout(() => {
            applyingLayoutChange.current = false;
          }, 300); // Cooldown to prevent flickering
        }
      }, 300); // Delay before opening
    },
    onMouseLeave: () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (mode === "hovering" && !applyingLayoutChange.current) {
        setMode("collapsed");
        applyingLayoutChange.current = true;
        setTimeout(() => {
          applyingLayoutChange.current = false;
        }, 300); // Cooldown to prevent flickering
      }
    },
  };

  const globalElementProps = {
    onMouseEnter: () => {
      isHoveringOverGlobal.current = true;
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    },
    onMouseLeave: () => {
      isHoveringOverGlobal.current = false;
    },
  };

  return { sidebarProps, globalElementProps };
};

export default useSidebarHover;
