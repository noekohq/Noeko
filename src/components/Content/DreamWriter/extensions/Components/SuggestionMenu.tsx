import React, { forwardRef, useMemo } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  FloatingPortal,
  FloatingFocusManager,
} from "@floating-ui/react";
import styles from "./SuggestionMenu.module.scss";
import { Card } from "@mantine/core";

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
};

const SuggestionMenu = ({
  getReferenceClientRect,
  items,
  activeIndex,
  onSelectionMade,
}: ISuggestionMenuProps) => {
  // Create a virtual element so Floating UI can position the menu
  // relative to the DOMRect provided by the parent.
  const virtualElement = useMemo(
    () => ({
      getBoundingClientRect: getReferenceClientRect,
    }),
    [getReferenceClientRect],
  );

  const { refs, floatingStyles, context } = useFloating({
    whileElementsMounted: autoUpdate,
    placement: "bottom-start",
    middleware: [offset(5), flip({ padding: 10 }), shift({ padding: 10 })],
  });

  refs.setReference(virtualElement);

  return (
    <FloatingPortal>
      {/* Manages focus, making the menu accessible */}
      <FloatingFocusManager context={context} modal={false}>
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className={styles.suggestionMenu}
          role="listbox" // ARIA role for a list of options
          aria-activedescendant={items[activeIndex]?.id} // Points to the active item's ID
        >
          {items.map((item, index) => (
            <Suggestion
              item={item}
              select={() => onSelectionMade(index)}
              active={index === activeIndex}
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
};

function Suggestion({ item, select, active }: ISuggestionProps) {
  return (
    <div
      role="option"
      key={item.id}
      id={item.id}
      aria-selected={active}
      className={`${styles.item} ${active ? styles.active : ""}`}
      onClick={() => select()}
    >
      {item.icon && <div className={styles.icon}>{item.icon}</div>}
      <div className={styles.details}>
        <div className={styles.label}>{item.label}</div>
        {item.description && (
          <div className={styles.description}>{item.description}</div>
        )}
      </div>
    </div>
  );
}
