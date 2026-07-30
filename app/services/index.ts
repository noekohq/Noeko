import { initAnalysis } from "./Analysis";
import { initSearch } from "./Search";
import { initInsights } from "./Insights";
import { initGraph } from "./Graph";
import { initSpyglassRunWorker } from "./SpyglassRunWorker";

export const initServices = async () => {
  console.info("Initializing services...");
  await initSearch();
  await initAnalysis();
  await initInsights();
  await initGraph();
  await initSpyglassRunWorker();
  console.info("Initialized services.");
};
