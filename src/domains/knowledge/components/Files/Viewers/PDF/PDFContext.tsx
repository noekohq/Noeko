import { FormattedSelection } from "@embedpdf/plugin-selection/react";
import { PdfHighlightAnnoObject } from "@embedpdf/models";
import { createContext, useContext, useMemo, useState } from "react";
import { IExcerpt, IExcerptForm } from "../../../../../../../shared/types/excerpt";
import { RecordId } from "surrealdb";

type IPDFViewerSelectionFormatted = {
  formatted: FormattedSelection;
};

type IPDFViewerSelectionText = {
  contents: string[];
};

type IPDFAnnotation = PdfHighlightAnnoObject;

interface IPDFViewerContext {
  selection: {
    text: {
      has: boolean;
      get: IPDFViewerSelectionText | null;
      set: (selection: IPDFViewerSelectionText | null) => void;
    };
    formatted: {
      has: boolean;
      get: IPDFViewerSelectionFormatted | null;
      set: (selection: IPDFViewerSelectionFormatted | null) => void;
    };
  };
  annotation: {
    selected: {
      get: IPDFAnnotation | null;
      set: (annotation: IPDFAnnotation | null) => void;
    };
  };
  state: {
    loading: boolean;
  };
}

const initialContext: IPDFViewerContext = {
  selection: {
    text: {
      has: false,
      get: null,
      set: () => {},
    },
    formatted: {
      has: false,
      get: null,
      set: () => {},
    },
  },
  annotation: {
    selected: {
      get: null,
      set: () => {},
    },
  },
  state: {
    loading: false,
  },
};

export const PDFViewerContext = createContext<IPDFViewerContext>(initialContext);

export const PDFViewerProvider = ({
  children,
  state,
}: {
  children: React.ReactNode;
  state: IPDFViewerContext["state"];
}) => {
  const [currentSelection, setCurrentSelection] =
    useState<IPDFViewerContext["selection"]["formatted"]["get"]>(null);
  const [currentSelectionText, setCurrentSelectionText] =
    useState<IPDFViewerContext["selection"]["text"]["get"]>(null);
  const [currentAnnotation, setCurrentAnnotation] =
    useState<IPDFViewerContext["annotation"]["selected"]["get"]>(null);
  const [loading, setLoading] = useState(false);

  const value: IPDFViewerContext = useMemo<IPDFViewerContext>(
    () => ({
      selection: {
        formatted: {
          has: currentSelection !== null,
          get: currentSelection,
          set: setCurrentSelection,
        },
        text: {
          has: currentSelectionText !== null,
          get: currentSelectionText,
          set: setCurrentSelectionText,
        },
      },
      annotation: {
        selected: {
          get: currentAnnotation,
          set: setCurrentAnnotation,
        },
      },
      state,
    }),
    [currentSelection, currentSelectionText, currentAnnotation]
  );

  return <PDFViewerContext.Provider value={value}>{children}</PDFViewerContext.Provider>;
};

export const usePDFViewer = () => useContext(PDFViewerContext);
