import { ReactNode } from "react";

export interface ISpotlightAction {
  id: string;
  title: string;
  description?: string;
  icon: ReactNode;
  keywords?: string;
  action: () => void;
}

export interface ISpotlightSubviewLink {
  id: string;
  title: string;
  icon: ReactNode;
  keywords?: string;
  subviewId: string;
}

export type SpotlightMainItem = ISpotlightAction | ISpotlightSubviewLink;

export interface IUnifiedSearchItem {
  id: string;
  title: string;
  displayTitle: ReactNode;
  displayDescription?: ReactNode;
  keywords?: string;
  icon: ReactNode;
  action: () => void;
  isTopLevel: boolean;
}

export interface ISubviewDefinition {
  id: string;
  title?: string;
  placeholder?: string;
  items?: (Omit<ISpotlightAction, "action"> & {
    action: (closeSpotlight: () => void) => void;
  })[];
  component?: (props: {
    searchText: string;
    closeSpotlight: () => void;
  }) => ReactNode;
  dynamicItems?: (props: {
    searchText: string;
    closeSpotlight: () => void;
  }) => Promise<ISpotlightAction[]>;
}
