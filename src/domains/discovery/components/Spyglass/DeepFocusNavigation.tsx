import React, { useEffect, useMemo, useState } from "react";
import { Badge, Group, Stack, Text } from "@mantine/core";
import { IFinding } from '../../../../../app/services/Spyglass';
import { IResultsMap } from '@domains/discovery/hooks/useSpyglassService';
import { scrollToElement } from '@core/utils/scroll';
import { IConnectableFields } from '../../../../../app/services/Graph';
import styles from "./Navigation.module.scss";

interface IDeepFocusNavigationProps {
  overview: string;
  findings: IFinding[];
  resultsMap: IResultsMap;
}

const DeepFocusNavigation: React.FC<IDeepFocusNavigationProps> = ({
  overview,
  findings,
  resultsMap,
}) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Group findings by source (same logic as Overview.tsx)
  const groupedFindings = useMemo(() => {
    const groups = new Map<
      string,
      { sourceId: string; resource: IConnectableFields; findings: IFinding[] }
    >();

    for (const finding of findings) {
      const resource = resultsMap[finding.sourceId];
      if (!resource) continue;

      const existing = groups.get(finding.sourceId);
      if (existing) {
        existing.findings.push(finding);
      } else {
        groups.set(finding.sourceId, {
          sourceId: finding.sourceId,
          resource,
          findings: [finding],
        });
      }
    }

    return Array.from(groups.values());
  }, [findings, resultsMap]);

  // IntersectionObserver for active tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-100px 0px -66%",
        threshold: 0,
      }
    );

    // Observe sections
    const sections = ["deep-focus-summary", "deep-focus-findings"];

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleSourceClick = (sourceId: string) => {
    // Scroll to findings section
    scrollToElement("deep-focus-findings");

    // Highlight specific card after scroll
    setTimeout(() => {
      const card = document.getElementById(`finding-${sourceId}`);
      if (card) {
        card.classList.add("highlight-pulse");
        setTimeout(() => {
          card.classList.remove("highlight-pulse");
        }, 2000);
      }
    }, 300); // Wait for scroll animation
  };

  return (
    <div className={styles.outline}>
      <Text fw="bold" c="dark.4" size="sm">
        OUTLINE
      </Text>

      {/* Summary */}
      {overview && (
        <div className={styles.section}>
          <Text fw="bold" c="dark.2" size="sm" mb="xs">
            SUMMARY
          </Text>
          <div
            className={`${styles.navItem} ${
              activeSection === "deep-focus-summary" ? styles.active : ""
            }`}
            onClick={() => scrollToElement("deep-focus-summary")}
          >
            <Text size="sm">Summary</Text>
          </div>
        </div>
      )}

      {/* Key Findings */}
      {groupedFindings.length > 0 && (
        <div className={styles.section}>
          <Group justify="space-between" mb="xs">
            <Text fw="bold" size="sm" c="dark.2">
              KEY FINDINGS
            </Text>
            <Badge size="xs" variant="light" color="gray">
              {findings.length}
            </Badge>
          </Group>
          <Stack gap={2}>
            {groupedFindings.map((group) => (
              <div
                key={group.sourceId}
                className={`${styles.navItem} ${styles.nestedItem}`}
                onClick={() => handleSourceClick(group.sourceId)}
              >
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <Text size="xs" lineClamp={1} style={{ flex: 1 }}>
                    {group.resource.name}
                  </Text>
                  <Badge size="xs" variant="light" color="gray" className={styles.badge}>
                    {group.findings.length}
                  </Badge>
                </Group>
              </div>
            ))}
          </Stack>
        </div>
      )}

      {/* Sources Analyzed */}
      {Object.keys(resultsMap).length > 0 && (
        <div className={styles.section}>
          <Group justify="space-between" mb="xs">
            <Text fw="bold" size="sm" c="dark.2">
              SOURCES ANALYZED
            </Text>
            <Badge size="xs" variant="light" color="gray">
              {Object.keys(resultsMap).length}
            </Badge>
          </Group>
          <div
            className={`${styles.navItem} ${activeSection === "deep-focus-findings" ? styles.active : ""}`}
            onClick={() => scrollToElement("deep-focus-findings")}
          >
            <Text size="sm">View all sources</Text>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepFocusNavigation;
