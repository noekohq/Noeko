import React from "react";
import styles from "./PaperIndicator.module.scss";
import { Text } from "@mantine/core";

type Position = "top-right" | "top-left" | "bottom-right" | "bottom-left";

interface PaperIndicatorProps {
  children: React.ReactNode;
  label: React.ReactNode;
  position?: Position;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
}

const PaperIndicator: React.FC<PaperIndicatorProps> = ({
  children,
  label,
  position = "top-right",
  className,
  wrapperClassName,
  disabled = false,
}) => {
  if (disabled) {
    return <>{children}</>;
  }

  const positionClass = styles[position];

  const renderLabel = () => {
    if (typeof label === "string" || typeof label === "number") {
      return (
        <Text size="xs" lh={1} inherit>
          {label}
        </Text>
      );
    }
    return label;
  };

  return (
    <div className={`${styles.wrapper} ${wrapperClassName || ""}`}>
      {children}
      <div className={`${styles.indicator} ${positionClass} ${className || ""}`}>
        {renderLabel()}
      </div>
    </div>
  );
};

export default PaperIndicator;
