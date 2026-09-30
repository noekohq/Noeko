import type { Icon, IconProps } from "@phosphor-icons/react";
import type { INode } from "@/declarations/graph";

export type SidebarAsyncState =
  | { status: "idle" }
  | { status: "loading"; message?: string }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

export type ConstellationPerspective = "mine" | "friend" | "organization";

export interface LandscapeFilter {
  id: string;
  label: string;
}

export interface LandscapeNotice {
  id: string;
  tone?: "info" | "warning" | "error";
  message: string;
}

export interface LandscapeSectionProps {
  perspective: ConstellationPerspective;
  perspectiveLabel?: string;
  onPerspectiveChange?: (perspective: ConstellationPerspective) => void;
  filters?: LandscapeFilter[];
  onRemoveFilter?: (filterId: string) => void;
  nodeCount: number;
  relationshipCount: number;
  onReset?: () => void;
  state?: SidebarAsyncState;
  notices?: LandscapeNotice[];
  controls?: React.ReactNode;
}

export type TraceEvidence = "text" | "semantic" | "connection" | "spyglass";

export interface FindTraceResult {
  node: INode;
  title: string;
  snippet: string;
  evidence: TraceEvidence;
  explanation?: string;
  similarity?: number;
  pathStep?: number;
}

export interface FindAndTraceSectionProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch?: (query: string) => void;
  results?: FindTraceResult[];
  resultLimit?: number;
  resultState?: SidebarAsyncState;
  onResultSelect?: (result: FindTraceResult) => void;
  onShowAllResults?: () => void;
  semanticLensActive?: boolean;
  semanticTargetTitle?: string;
  onSemanticLensChange?: (active: boolean) => void;
  onStartTrace?: (query: string) => void;
  onUseResultsAsSelection?: (results: FindTraceResult[]) => void;
}

export interface SelectionItem {
  id: string;
  title: string;
  detail?: React.ReactNode;
  icon?: React.FC<IconProps>;
  link?: string;
}

export interface SelectionProvenance {
  label: string;
  detail?: string;
}

export interface SelectionAction {
  id: "rabbithole" | "tag" | "connect" | "spyglass" | (string & {});
  label: string;
  icon?: Icon;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  loading?: boolean;
}

export interface SelectionSectionProps {
  title?: string;
  items: SelectionItem[];
  provenance?: SelectionProvenance;
  itemLimit?: number;
  onRemoveItem?: (itemId: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onFocusItem?: (itemId: string) => void;
  onShowAllItems?: () => void;
  actions?: SelectionAction[];
  actionContent?: React.ReactNode;
  onExploreRelated?: (itemId: string) => void;
  state?: SidebarAsyncState;
}

export interface PerspectiveRelationshipSummary {
  id: "owned-by-them" | "shared-by-them" | "shared-with-them" | "overlap" | (string & {});
  label: string;
  count: number;
  onSelect?: () => void;
}

export interface PerspectiveDetailsSectionProps {
  perspective: Exclude<ConstellationPerspective, "mine">;
  name: string;
  detail?: string;
  permissionLabel?: string;
  relationships?: PerspectiveRelationshipSummary[];
  relationshipLimit?: number;
  onShowAllRelationships?: () => void;
  onReturnToMine?: () => void;
  state?: SidebarAsyncState;
}

export interface ConstellationSidebarProps {
  landscape: LandscapeSectionProps;
  selection: SelectionSectionProps;
  perspectiveDetails?: PerspectiveDetailsSectionProps;
  className?: string;
}
