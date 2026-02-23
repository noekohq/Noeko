import React from "react";
import { MantineColor, MantineRadius, MantineShadow, MantineSpacing } from "@mantine/core";
import type { IconProps, IconWeight } from "phosphor-react"; // Import Phosphor types
import type { IIdea } from '../../../../../shared/types/idea'; // ENSURE THIS PATH IS CORRECT

// Re-export IIdea if you want it to be part of this module's public API
export type { IIdea };

export type IIdeaCardsTypes = "compact" | "standard" | "detailed";

export type PhosphorIcon = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>;

export type IdeaAction = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>; // Expect a Phosphor icon instance e.g. <User size={16} />
  onClick: (event: React.MouseEvent, idea: IIdea) => void;
  color?: MantineColor;
  variant?: "filled" | "light" | "outline" | "default" | "subtle" | "transparent" | "white";
  disabled?: boolean;
  tooltip?: string;
  isOverflow?: boolean; // If true, primarily for the overflow menu
};

export type IdeaTag = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>; // Phosphor Icon instance
  color?: MantineColor;
  variant?: "filled" | "light" | "outline" | "dot";
};

export type IdeaArtifact = {
  id: string;
  content: React.ReactNode;
  tooltip?: string;
  icon?: React.ReactElement<IconProps>; // Phosphor Icon instance
};

export interface IdeaCardSharedProps {
  idea: ISafeIIdea;
  artifacts?: IdeaArtifact[];
  tags?: IdeaTag[];
  actions?: IdeaAction[];
  link?: boolean;

  onCardClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, idea: IIdea) => void;

  draggable?: boolean;
  onDragStartCard?: (event: React.DragEvent<HTMLDivElement>, idea: IIdea) => void;
  onDragEndCard?: (event: React.DragEvent<HTMLDivElement>, idea: IIdea) => void;
  // If you want an internal, default drag handle to appear:
  showDefaultDragHandle?: boolean;

  isExternallyHighlighted?: boolean;
  onMouseEnterCard?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, ideaId: string) => void;
  onMouseLeaveCard?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, ideaId: string) => void;

  className?: string;
  cardPadding?: MantineSpacing;
  cardRadius?: MantineRadius;
  cardShadow?: MantineShadow;
  style?: React.CSSProperties;
}
