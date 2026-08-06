/**
 * Semantic similarity cutoffs shared by search and proactive organization.
 *
 * Keep these centralized: cosine score distributions can shift when the
 * embedding provider, model, dimensions, or input construction changes.
 */
export const GLOBAL_SEMANTIC_SEARCH_THRESHOLD = 0.45;

export const RABBITHOLE_AUTO_ADD_THRESHOLD = 0.6;

export const getDefaultRabbitholeSimilarityThreshold = (mode: "suggest" | "auto-add") =>
  mode === "auto-add" ? RABBITHOLE_AUTO_ADD_THRESHOLD : GLOBAL_SEMANTIC_SEARCH_THRESHOLD;
