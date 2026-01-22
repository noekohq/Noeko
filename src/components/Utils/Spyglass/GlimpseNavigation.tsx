import React, { useEffect, useState } from "react";
import { Badge, Group, Stack, Text } from "@mantine/core";
import { PartialGlimpseResult } from "../../../utils/partialJsonParser";
import { IResultsMap } from "../../../hooks/useSpyglassService";
import { scrollToElement } from "../../../utils/scroll";
import styles from "./Navigation.module.scss";

interface IGlimpseNavigationProps {
  glimpseResult: PartialGlimpseResult;
  resultsMap: IResultsMap;
}

const GlimpseNavigation: React.FC<IGlimpseNavigationProps> = ({
  glimpseResult,
  resultsMap,
}) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

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
      },
    );

    const sections: string[] = [];

    if (glimpseResult.entryPoint) {
      sections.push("glimpse-entry-point");
    }

    glimpseResult.contentMap?.forEach((_, i) => {
      sections.push(`glimpse-section-${i}`);
    });

    if (glimpseResult.connections && glimpseResult.connections.length > 0) {
      sections.push("glimpse-connections");
    }

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [glimpseResult]);

  return (
    <div className={styles.outline}>
      <Text fw="bold" c="dark.4" size="sm">
        OUTLINE
      </Text>

      {/* Entry Point */}
      {glimpseResult.entryPoint && (
        <div className={styles.section}>
          <Text fw="bold" c="dark.2" size="sm" mb="xs">
            ENTRY POINT
          </Text>
          <div
            className={`${styles.navItem} ${activeSection === "glimpse-entry-point" ? styles.active : ""}`}
            onClick={() => scrollToElement("glimpse-entry-point")}
          >
            <Text size="sm" lineClamp={1}>
              {glimpseResult.entryPoint.title}
            </Text>
          </div>
        </div>
      )}

      {/* Content Map */}
      {glimpseResult.contentMap && glimpseResult.contentMap.length > 0 && (
        <div className={styles.section}>
          <Text fw="bold" size="sm" c="dark.2" mb="xs">
            CONTENT MAP
          </Text>
          <Stack gap={2}>
            {glimpseResult.contentMap.map((section, index) => (
              <div
                key={index}
                className={`${styles.navItem} ${activeSection === `glimpse-section-${index}` ? styles.active : ""}`}
                onClick={() => scrollToElement(`glimpse-section-${index}`)}
              >
                <Text size="sm" lineClamp={1}>
                  {section.title}
                </Text>
              </div>
            ))}
          </Stack>
        </div>
      )}

      {/* Connections */}
      {glimpseResult.connections && glimpseResult.connections.length > 0 && (
        <div className={styles.section}>
          <Group justify="space-between" mb="xs">
            <Text fw="bold" size="sm" c="dark.2">
              CONNECTIONS
            </Text>
            <Badge size="xs" variant="light" color="gray">
              {glimpseResult.connections.length}
            </Badge>
          </Group>
          <div
            className={`${styles.navItem} ${activeSection === "glimpse-connections" ? styles.active : ""}`}
            onClick={() => scrollToElement("glimpse-connections")}
          >
            <Text size="sm">View connections</Text>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlimpseNavigation;
