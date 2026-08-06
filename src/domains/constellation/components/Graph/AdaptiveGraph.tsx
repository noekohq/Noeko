import { forwardRef, useCallback, useState } from "react";
import Graph, { type IGraphContainerProps, type IGraphController } from "./Graph";
import WebGLGraph from "./WebGLGraph";
import type { IConstellationVisualMode } from "./visualModes";

export type IGraphRendererPreference = "auto" | "svg" | "webgl";

type IAdaptiveGraphProps = IGraphContainerProps & {
  renderer?: IGraphRendererPreference;
  visualMode?: IConstellationVisualMode;
};

const supportsWebGL2 = () => {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  return !!canvas.getContext("webgl2");
};

const getSavedPreference = (): IGraphRendererPreference => {
  if (typeof localStorage === "undefined") return "auto";
  const preference = localStorage.getItem("noeko:constellation-renderer");
  return preference === "svg" || preference === "webgl" ? preference : "auto";
};

const AdaptiveGraph = forwardRef<IGraphController, IAdaptiveGraphProps>(
  ({ renderer, visualMode, ...props }, ref) => {
    const [webGLFailed, setWebGLFailed] = useState(false);
    const [webGLSupported] = useState(supportsWebGL2);
    const [savedPreference] = useState(getSavedPreference);
    const [coarsePointer] = useState(
      () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
    );
    const handleUnavailable = useCallback(() => setWebGLFailed(true), []);
    const preference = renderer || savedPreference;
    const useWebGL =
      preference !== "svg" &&
      !webGLFailed &&
      webGLSupported &&
      (preference === "webgl" || !coarsePointer);

    if (!useWebGL) return <Graph ref={ref} {...props} />;
    return (
      <WebGLGraph ref={ref} {...props} visualMode={visualMode} onUnavailable={handleUnavailable} />
    );
  }
);

AdaptiveGraph.displayName = "AdaptiveGraph";

export default AdaptiveGraph;
