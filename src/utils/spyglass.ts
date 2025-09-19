import { ISearchOverview } from "../../app/database/models/search";
import { IFinding } from "../../app/services/Spyglass";
import { INode } from "../declarations/graph";
import { IResultsMap } from "../pages/Spyglass/hooks/useSpyglass";
import { getNodeTitle, getTypeFromId } from "./graph";

// A helper type to make the grouped findings map more explicit
type GroupedFindings = Map<string, (IFinding & { index: number })[]>;

export const getOverviewAsMarkdown = (
  analysis: ISearchOverview,
  resultsMap: IResultsMap,
): string => {
  const { overview, findings } = analysis;

  // 1. Group findings by their source ID
  const findingsBySource = findings.reduce<GroupedFindings>(
    (acc, current, findingNumber) => {
      const sourceFindings = acc.get(current.sourceId) ?? [];
      sourceFindings.push({ ...current, index: findingNumber });
      acc.set(current.sourceId, sourceFindings);
      return acc;
    },
    new Map(),
  );

  // 2. Format each group of findings into a Markdown string
  const formattedFindingSections = Array.from(findingsBySource.entries())
    .map(([sourceId, sourceFindings]) => {
      const nodeType = getTypeFromId(sourceId);

      // Early return for invalid node types
      if (!nodeType) {
        return null;
      }

      const sourceNode = resultsMap[sourceId];
      if (!sourceNode) {
        return null; // Or handle as an error
      }

      const title = getNodeTitle({ ...sourceNode, type: nodeType } as INode);

      // Create the markdown for each individual finding under this source
      const findingsMarkdown = sourceFindings
        .map(
          (finding) => `> ${finding.excerpt}

[${finding.index + 1}] | ${finding.findingType}
${finding.analysis}`,
        )
        .join("\n\n---\n\n"); // Explicitly join with a separator

      return `### ${title}\n\n${findingsMarkdown}`;
    })
    .filter((section): section is string => Boolean(section)); // 3. Filter out any null entries

  // 4. Combine all parts into the final document
  return `${overview}

---
# Findings

${formattedFindingSections.join("\n\n")}`; // 4. Explicitly join the sections
};
