import { createContext, useContext, useEffect, useRef, useState } from "react";
import { IExcerpt, IExcerptForm } from '../../../../../shared/types/excerpt';
import { RecordId } from "surrealdb";
import { ISource } from '../../../../../app/database/models/source';
import useFetch from '@core/hooks/useFetch';
import { createExcerpt, deleteExcerpt, editExcerpt, getExcerpt } from '@domains/knowledge/utils/excerpts';

interface ISourceContext {
  excerpts: {
    all: IExcerpt[];
    create: (excerpt: IExcerptForm) => Promise<IExcerpt | undefined>;
    edit: (id: string | RecordId, form: Partial<IExcerptForm>) => Promise<IExcerpt | undefined>;
    delete: (id: string | RecordId) => void;
    reload: () => Promise<void>;
    get: (id: string | RecordId) => Promise<IExcerpt | undefined>;
  };
}

const initialSourceContext: ISourceContext = {
  excerpts: {
    all: [],
    create: async () => undefined,
    edit: async () => undefined,
    delete: async () => {},
    reload: async () => {},
    get: async (id: string | RecordId) => undefined,
  },
};

export const SourceContext = createContext<ISourceContext>(initialSourceContext);

export const SourceProvider = ({
  children,
  source,
}: {
  children: React.ReactNode;
  source: ISource | undefined;
}) => {
  const [all, setAll] = useState<IExcerpt[]>();
  const currentlyLoading = useRef(false);
  const { load: loadExcerpts, loading: loadingExcerpts } = useFetch<undefined, IExcerpt[]>({
    url: `/excerpts/${source?.id.toString()}/all`,
    dependencies: [source?.id],
    onBefore: () => {
      currentlyLoading.current = true;
    },
    onSuccess: (v) => {
      setAll(v);
    },
    onFinally: () => {
      currentlyLoading.current = false;
    },
  });

  useEffect(() => {
    if (source?.id.toString() && !loadingExcerpts && !currentlyLoading.current) {
      loadExcerpts();
    }
  }, [source?.id.toString()]);

  const value: ISourceContext = {
    excerpts: {
      all: all ?? [],
      create: async (form) => {
        if (!source) {
          console.error("Can't create excerpt without source available");
          return undefined;
        }
        const created = await createExcerpt(source.id, form);
        loadExcerpts();
        return created;
      },
      edit: async (id, form) => {
        const updated = await editExcerpt(id, form);
        loadExcerpts();
        return updated;
      },
      delete: async (id) => {
        const deleted = await deleteExcerpt(id);
        loadExcerpts();
        return deleted;
      },
      reload: async () => {
        loadExcerpts();
      },
      get: async (id) => {
        const fetched = await getExcerpt(id);
        loadExcerpts();
        return fetched;
      },
    },
  };

  return <SourceContext.Provider value={value}>{children}</SourceContext.Provider>;
};

export const useSource = () => {
  const context = useContext(SourceContext);
  if (!context) {
    throw new Error("useSource must be used within a SourceProvider");
  }
  return context;
};
