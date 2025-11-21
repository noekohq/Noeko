import React, {
  createContext,
  useContext,
  useState,
  useRef,
  forwardRef,
  cloneElement,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  useFloating,
  FloatingPortal,
  FloatingFocusManager,
  useInteractions,
  useDismiss,
  useRole,
  FloatingArrow,
  arrow,
  offset,
  Strategy,
  FloatingContext,
  shift,
  flip,
  useClick,
  useHover,
} from "@floating-ui/react";
import {
  Box,
  Paper,
  Stack,
  Text,
  CopyButton,
  Tooltip,
  Group,
} from "@mantine/core";
import styles from "./PaperContextMenu.module.scss";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useLayout } from "../../../contexts/LayoutContext";

// --- Context ---

interface PaperContextMenuContextValue {
  opened: boolean;
  setOpened: React.Dispatch<React.SetStateAction<boolean>>;
  reference: (node: any) => void;
  floating: (node: HTMLElement | null) => void;
  x: number | null;
  y: number | null;
  strategy: Strategy;
  context: FloatingContext;
  getFloatingProps: (
    props?: React.HTMLProps<HTMLElement>,
  ) => Record<string, unknown>;
  arrowRef: React.RefObject<SVGSVGElement | null>;
  triggerOn: "contextmenu" | "click" | "hover" | "hold";
  getReferenceProps: (
    props?: React.HTMLProps<HTMLElement>,
  ) => Record<string, unknown>;
}

const PaperContextMenuContext =
  createContext<PaperContextMenuContextValue | null>(null);

export const usePaperContextMenu = () => {
  const context = useContext(PaperContextMenuContext);
  if (!context) {
    throw new Error(
      "usePaperContextMenu must be used within a PaperContextMenu",
    );
  }
  return context;
};

// --- Main Component ---

interface IPaperContextMenuProps {
  children: React.ReactNode;
  triggerOn?: "contextmenu" | "click" | "hover" | "hold";
}

const PaperContextMenuComponent = ({
  children,
  triggerOn: triggerOnProp,
}: IPaperContextMenuProps) => {
  const [opened, setOpened] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);
  const { isMobile } = useLayout();

  const [triggerOn, setTriggerOn] = useState<
    "contextmenu" | "click" | "hover" | "hold"
  >(triggerOnProp || "contextmenu");

  useEffect(() => {
    if (triggerOnProp) {
      setTriggerOn(triggerOnProp);
      return;
    }
    setTriggerOn(isMobile ? "hold" : "contextmenu");
  }, [triggerOnProp]);

  const { x, y, strategy, context, refs } = useFloating({
    open: opened,
    onOpenChange: setOpened,
    placement: "bottom-start",
    middleware: [
      offset(5),
      flip({ fallbackAxisSideDirection: "start" }),
      shift({ padding: 5 }),
      arrow({ element: arrowRef }),
    ],
  });

  const click = useClick(context, {
    enabled: triggerOn === "click",
  });
  const hover = useHover(context, {
    enabled: triggerOn === "hover",
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    hover,
    useDismiss(context),
    useRole(context),
  ]);

  const contextValue = {
    opened,
    setOpened,
    reference: refs.setReference,
    floating: refs.setFloating,
    x,
    y,
    strategy,
    context,
    getFloatingProps,
    getReferenceProps,
    arrowRef,
    triggerOn,
  };

  return (
    <PaperContextMenuContext.Provider value={contextValue}>
      {children}
    </PaperContextMenuContext.Provider>
  );
};

// --- Target ---

// --- useLongPress Hook ---
function useLongPress(
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void,
  { delay = 400, moveThreshold = 10 } = {},
) {
  const timeout = useRef<NodeJS.Timeout>();
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const isLongPress = useRef(false);

  const start = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      // Right-click doesn't count as a long press
      if ("button" in event && event.button === 2) return;

      isLongPress.current = false;
      const point = "touches" in event ? event.touches[0] : event;
      startPos.current = { x: point.clientX, y: point.clientY };

      timeout.current = setTimeout(() => {
        onLongPress(event);
        isLongPress.current = true;
      }, delay);
    },
    [onLongPress, delay],
  );

  const cancel = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  const handleMove = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!startPos.current) return;

      const point = "touches" in event ? event.touches[0] : event;
      const dx = Math.abs(point.clientX - startPos.current.x);
      const dy = Math.abs(point.clientY - startPos.current.y);

      if (dx > moveThreshold || dy > moveThreshold) {
        cancel();
      }
    },
    [moveThreshold, cancel],
  );

  const handleUp = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      cancel();
      if (isLongPress.current) {
        // Prevent context menu on desktop right click, and click events on mobile.
        event.preventDefault();
      }
    },
    [cancel],
  );

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: handleUp,
    onTouchEnd: handleUp,
    onMouseMove: handleMove,
    onTouchMove: handleMove,
  };
}

// Helper to merge refs
function mergeRefs<T = any>(
  refs: Array<React.MutableRefObject<T> | React.LegacyRef<T>>,
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

const Target = ({
  children,
}: {
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}) => {
  const { reference, setOpened, getReferenceProps, triggerOn } =
    usePaperContextMenu();

  const onLongPress = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const point = "touches" in e ? e.touches[0] : e;
      reference({
        getBoundingClientRect: () => ({
          width: 0,
          height: 0,
          x: point.clientX,
          y: point.clientY,
          top: point.clientY,
          left: point.clientX,
          right: point.clientX,
          bottom: point.clientY,
        }),
      });
      setOpened(true);
    },
    [reference, setOpened],
  );

  const longPressEvents = useLongPress(onLongPress);

  if (triggerOn === "hold") {
    return cloneElement(children, longPressEvents);
  }

  if (triggerOn === "contextmenu") {
    return cloneElement(children, {
      onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();

        children.props.onContextMenu?.(e);

        reference({
          getBoundingClientRect: () => ({
            width: 0,
            height: 0,
            x: e.clientX,
            y: e.clientY,
            top: e.clientY,
            left: e.clientX,
            right: e.clientX,
            bottom: e.clientY,
          }),
        });
        setOpened(true);
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const childrenRef = (children as any).ref;
  const ref = useMemo(
    () => mergeRefs([reference, childrenRef]),
    [reference, childrenRef],
  );

  return cloneElement(children, getReferenceProps({ ...children.props, ref }));
};

// --- Dropdown ---

const Dropdown = ({ children }: { children: React.ReactNode }) => {
  const {
    opened,
    floating,
    x,
    y,
    strategy,
    context,
    getFloatingProps,
    arrowRef,
  } = usePaperContextMenu();

  return (
    <FloatingPortal>
      {opened && (
        <FloatingFocusManager context={context} modal={false}>
          <div
            ref={floating}
            className={styles.contextMenu}
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0,
              width: "max-content",
            }}
            {...getFloatingProps()}
          >
            <div className={styles.content}>{children}</div>
            {/*<FloatingArrow
              ref={arrowRef}
              context={context}
              className={styles.arrow}
            />*/}
          </div>
        </FloatingFocusManager>
      )}
    </FloatingPortal>
  );
};

// --- Item ---
interface PaperContextMenuItemProps
  extends React.ComponentPropsWithoutRef<"div"> {
  icon?: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}

const Item = forwardRef<HTMLDivElement, PaperContextMenuItemProps>(
  ({ icon, children, disabled, ...props }, ref) => {
    const { setOpened } = usePaperContextMenu();
    return (
      <div
        {...props}
        ref={ref}
        className={`${styles.item} ${disabled ? styles.disabled : ""}`}
        onClick={(e) => {
          if (!disabled) {
            props.onClick?.(e);
            setOpened(false);
          }
        }}
      >
        {icon && <Box className={styles.itemIcon}>{icon}</Box>}
        <Box className={styles.itemLabel}>{children}</Box>
      </div>
    );
  },
);

// --- Label ---
const Label = ({ children }: { children: React.ReactNode }) => {
  return <div className={styles.label}>{children}</div>;
};

// --- Detail ---
const Detail = ({
  label,
  children,
  valueToCopy,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  valueToCopy?: string;
}) => {
  const valueContent = (
    <Text size="sm" lh={1.3}>
      {children}
    </Text>
  );

  return (
    <div className={styles.detail}>
      <Text size="xs" c="dimmed" fw={500}>
        {label}
      </Text>
      {valueToCopy ? (
        <CopyButton value={valueToCopy}>
          {({ copied, copy }) => (
            <Group wrap="nowrap" gap="4px">
              <div onClick={copy} className={styles.copyableValue}>
                {valueContent}
              </div>
              <div className={styles.copyIndicator} onClick={copy}>
                {copied ? <CheckIcon /> : <CopyIcon />}
              </div>
            </Group>
          )}
        </CopyButton>
      ) : (
        valueContent
      )}
    </div>
  );
};

PaperContextMenuComponent.Target = Target;
PaperContextMenuComponent.Dropdown = Dropdown;
PaperContextMenuComponent.Item = Item;
PaperContextMenuComponent.Label = Label;
PaperContextMenuComponent.Detail = Detail;

export const PaperContextMenu = PaperContextMenuComponent;
