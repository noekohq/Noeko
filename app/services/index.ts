import { initAnalysis } from "./Analysis";
import { initSearch } from "./Search";
import { initInsights } from "./Insights";
import { initGraph } from "./Graph";

export const initServices = async () => {
  console.info("Initializing services...");
  await initSearch();
  await initAnalysis();
  await initInsights();
  await initGraph();
  console.info("Initialized services.");
};
