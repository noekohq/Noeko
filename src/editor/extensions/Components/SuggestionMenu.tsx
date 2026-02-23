import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  FloatingPortal,
  FloatingFocusManager,
  size,
} from "@floating-ui/react";
import styles from "./SuggestionMenu.module.scss";

type ISuggestionItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
};

type ISuggestionMenuProps = {
  getReferenceClientRect: () => DOMRect;
  items: ISuggestionItem[];
  activeIndex: number;
  onSelectionMade: (index: number) => void;
  loading?: boolean;
};

const SuggestionMenu = ({
  getReferenceClientRect,
  items,
  activeIndex,
  onSelectionMade,
  loading,
}: ISuggestionMenuProps) => {
  const virtualElement = useMemo(
    () => ({
      getBoundingClientRect: getReferenceClientRect,
    }),
    [getReferenceClientRect]
  );
  const listRef = useRef<HTMLDivElement>(null); // Ref for the scrollable list container
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]); // Refs for each item

  const { refs, floatingStyles, context } = useFloating({
    whileElementsMounted: autoUpdate,
    placement: "bottom-start",
    middleware: [
      offset(5),
      flip({ padding: 10 }),
      shift({ padding: 10 }),
      size({
        apply({ availableHeight, elements }) {
          // 3. Apply the calculated max-height to the floating element
          Object.assign(elements.floating.style, {
            maxHeight: `${availableHeight}px`,
          });
        },
        padding: 10, // Keep a 10px buffer from the viewport edge
      }),
    ],
  });

  const transform = getTransformFromDomRect(virtualElement.getBoundingClientRect());

  const correctedFloatingStyles = () => {
    if (!floatingStyles.transform) {
      return {
        ...floatingStyles,
        transform,
      };
    }
    return floatingStyles;
  };

  useEffect(() => {
    const activeItem = itemRefs.current[activeIndex];
    if (activeItem) {
      activeItem.scrollIntoView({
        block: "nearest", // Avoids scrolling if the item is already visible
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    refs.setReference(virtualElement);
    if (listRef.current) {
      refs.setFloating(listRef.current);
    }
  }, [refs, virtualElement, listRef]);

  return (
    <FloatingPortal>
      {/* Manages focus, making the menu accessible */}
      <FloatingFocusManager context={context} modal={false}>
        <div
          ref={listRef}
          style={correctedFloatingStyles()}
          className={styles.suggestionMenu}
          role="listbox" // ARIA role for a list of options
          aria-activedescendant={items[activeIndex]?.id} // Points to the active item's ID
        >
          {loading && (
            <div className={`${styles.item} ${styles.noAnimate}`}>
              <div className={styles.label}>Loading suggestions...</div>
            </div>
          )}
          {!items.length && !loading && (
            <div className={`${styles.item} ${styles.noAnimate}`}>
              <div className={styles.label}>No suggestions available</div>
            </div>
          )}
          {items.map((item, index) => (
            <Suggestion
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              key={item.id}
              item={item}
              select={() => onSelectionMade(index)}
              active={index === activeIndex}
              index={index}
            />
          ))}
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
};

export default SuggestionMenu;

type ISuggestionProps = {
  item: ISuggestionItem;
  select: () => void;
  active: boolean;
  index: number;
};

const delayConstant = 50;

const Suggestion = React.forwardRef<HTMLDivElement, ISuggestionProps>(
  ({ item, select, active, index }, ref) => {
    return (
      <div
        ref={ref} // Attach the ref here
        role="option"
        id={item.id}
        aria-selected={active}
        className={`${styles.item} ${active ? styles.active : ""}`}
        onClick={() => select()}
        style={{
          animationDelay: `${delayConstant * Math.log(index + 1)}ms`,
        }}
      >
        {item.icon && <div className={styles.icon}>{item.icon}</div>}
        <div className={styles.details}>
          <div className={styles.label}>{item.label}</div>
          {item.description && <div className={styles.description}>{item.description}</div>}
        </div>
      </div>
    );
  }
);

function getTransformFromDomRect(rect: DOMRect) {
  return `translate(${rect.left}px, ${rect.top + rect.height}px)`;
}
