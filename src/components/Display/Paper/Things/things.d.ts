export type IThing = {
  id: string;
  title: string;
  detail: string | React.ReactNode;
  icon?: React.FC<IconProps>;
  link?: string;
  onDelete?: () => void;
  onClick?: (id: string, e: React.MouseEvent | React.KeyboardEvent) => void;
  preventClickDefault?: boolean;
  draggable?: boolean;
  createdAt?: string;
  updatedAt?: string;

  // The action on the right side (e.g., the "+" button)
  action?: {
    icon: React.FC<IconProps>;
    tooltip: string;
    onClick: (id: string, e: React.MouseEvent) => void;
  };

  // The hover card content
  preview?: React.ReactNode;
};
