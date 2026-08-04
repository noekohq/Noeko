import { useCallback, useEffect, useState } from "react";
import { DefaultResponse } from "@/declarations/server";
import { api } from "@infrastructure/api/client";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipGlobal403Redirect?: boolean;
  }
}

export interface UseFetchConfig<B, D> {
  url: string | null;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: B;
  onBefore?: () => void;
  onSuccess?: (data: D, message?: string) => void;
  onError?: (err: unknown) => void;
  onFinally?: () => void;
  headers?: Record<string, string> | undefined;
  query?: Record<string, string> | undefined;
  bustCache?: boolean;
  runOnMount?: boolean;
  dependencies?: unknown[];
  runOnDependencies?: unknown[];
  skip403Redirect?: boolean;
}

function useFetch<B, D>({
  url,
  method = "GET",
  body,
  onBefore,
  onSuccess,
  onError,
  onFinally,
  headers,
  query,
  bustCache,
  runOnMount = false,
  dependencies = [],
  runOnDependencies = [],
  skip403Redirect,
}: UseFetchConfig<B, D>) {
  const queryStr = query
    ? Object.keys(query)
        .map((key) => (query[key] ? `${key}=${query[key]}` : ""))
        .join("&")
    : "";

  const urlToUse = queryStr && url ? `${url}?${queryStr}` : url;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<D>();
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const useBody = () => {
    if (body instanceof FormData) {
      return body;
    }
    return {
      ...body,
    };
  };

  const load = useCallback(
    async (loadConfig?: { updatedUrl?: string; updatedBody?: B }) => {
      if (!urlToUse) {
        console.error("Missing updatedUrl in loadConfig", queryStr, url);
        return;
      }
      refreshHeaders();
      onBefore && onBefore();
      setLoading(true);
      return api<DefaultResponse<D>>(loadConfig?.updatedUrl || urlToUse, {
        method,
        data: loadConfig?.updatedBody ?? useBody(),
        headers,
        skipGlobal403Redirect: skip403Redirect,
      })
        .then((res) => {
          onSuccess && onSuccess(res.data.data as D, res.data.message as string);
          setData(res.data.data);
          setSuccess(true);
          return res.data;
        })
        .catch((err) => {
          onError && onError(err);
          setData(undefined);
          setSuccess(false);
          const message = err?.response?.data?.message || err?.message || null;
          setErrors([message]);
          return {
            error: err,
            success: false,
            data: null,
            message,
          } as DefaultResponse<null>;
        })
        .finally(() => {
          setLoading(false);
          onFinally && onFinally();
        });
    },
    [urlToUse, method, body, headers, bustCache, ...dependencies]
  );

  const refreshHeaders = () => {
    api.defaults.headers["Authorization"] = `Bearer ${localStorage.getItem("accessToken")}`;
    api.defaults.headers["x-refresh-token"] = localStorage.getItem("refreshToken");
  };

  useEffect(() => {
    if (runOnMount || (runOnDependencies.length > 0 && runOnDependencies.every((dep) => !!dep))) {
      refreshHeaders();
      if (urlToUse) {
        load({
          updatedUrl: urlToUse,
          updatedBody: body,
        });
      } else {
        console.error("Missing urlToUse");
      }
    }
  }, [urlToUse, method, body, headers, bustCache, runOnMount, ...runOnDependencies]);

  const loadWithUrl = useCallback(
    (url: string) => {
      api<DefaultResponse<D>>(url, {
        method,
        data: {
          ...body,
        },
        headers,
        skipGlobal403Redirect: skip403Redirect,
      })
        .then((res) => {
          onSuccess && onSuccess(res.data.data as D, res.data.message);
          setData(res.data.data);
          setSuccess(true);
          return res.data;
        })
        .catch((err) => {
          onError && onError(err);
          setData(undefined);
          setSuccess(false);
          return {
            error: err,
            success: false,
            data: null,
          } as DefaultResponse<null>;
        });
    },
    [load]
  );

  const resetData = () => {
    setData(undefined);
  };

  return { loading, data, load, success, loadWithUrl, errors, resetData };
}

export default useFetch;
