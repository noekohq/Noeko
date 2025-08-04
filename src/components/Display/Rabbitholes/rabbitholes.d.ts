export type IRabbitholeAction = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: (event: React.MouseEvent, rabbithole: IRabbithole) => void;
  color?: MantineColor;
  variant?:
    | "filled"
    | "light"
    | "outline"
    | "default"
    | "subtle"
    | "transparent"
    | "white";
  disabled?: boolean;
  tooltip?: string;
  isOverflow?: boolean; // If true, primarily for the overflow menu
};
