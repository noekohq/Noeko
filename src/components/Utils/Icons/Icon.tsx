import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  (
    { children, size = 24, color = "var(--mantine-color-text)", viewBox = "0 0 256 256", ...rest },
    ref
  ) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        fill={color}
        viewBox={viewBox} // Common viewBox for Phosphor icons
        {...rest}
      >
        {children}
      </svg>
    );
  }
);
