import React, { useMemo, useState } from "react";
import styles from "./PaperThings.module.scss";
import { IThing } from "./things";
import { Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { formatDateShort } from "../../../../utils/formatting";
import IconToggle from "../../Interactions/Toggle/IconToggle";
import ContextMenuWrapper from "./ContextMenuWrapper";
import GridCard from "./GridCard";
import { Icon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router";
import { useLayout } from "../../../../contexts/LayoutContext";

interface IPaperThingsProps {
  things: IThing[];
  modes: {
    value: string;
    icon: Icon;
  }[];
  defaultMode?: string;
  customViews?: Record<string, React.ReactNode>;
}

export default function PaperThings({
  things,
  modes,
  defaultMode,
  customViews,
}: IPaperThingsProps) {
  if (modes.length === 0) {
    throw new Error("No modes provided");
  }

  const { isMobile } = useLayout();

  const [mode, setMode] = useState(defaultMode || modes[0].value);
  const [filterQuery, setFilterQuery] = useState("");

  const filteredThings = useMemo(() => {
    if (!filterQuery.trim()) {
      return things;
    }
    const query = filterQuery.toLowerCase();
    return things.filter((thing) => {
      const titleMatch = thing.title?.toLowerCase().includes(query);
      const detailMatch =
        typeof thing.detail === "string"
          ? thing.detail.toLowerCase().includes(query)
          : false;
      return titleMatch || detailMatch;
    });
  }, [things, filterQuery]);

  const builtInViews: Record<string, React.FC<{ things: IThing[] }>> = {
    list: ThingList,
    grid: ThingGrid,
  };

  const ViewComponent = builtInViews[mode];
  const CustomView = customViews?.[mode];

  return (
    <div className={styles.paperThings}>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>
            {filteredThings.length} Item
            {filteredThings.length === 1 ? "" : "s"}
          </Title>
          <Group justify="space-between" w={isMobile ? "100%" : ""}>
            <TextInput
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.currentTarget.value)}
              placeholder="Filter items..."
              leftSection={<MagnifyingGlassIcon />}
            />
            <IconToggle
              options={modes}
              value={mode}
              onChange={(v) => {
                setMode(v);
              }}
            />
          </Group>
        </Group>
        <div className={styles.content}>
          {CustomView ? (
            CustomView
          ) : ViewComponent ? (
            <ViewComponent things={filteredThings} />
          ) : (
            <div>
              View '<strong>{mode}</strong>' not supported
            </div>
          )}
        </div>
      </Stack>
    </div>
  );
}

interface IThingTableProps {
  things: IThing[];
}

function ThingList({ things }: IThingTableProps) {
  const oneChild = things.length === 1;
  const navigate = useNavigate();

  return (
    <div className={styles.thingList}>
      {things.map((t, index) => {
        const Icon = t.icon;

        return (
          <ContextMenuWrapper thing={t}>
            <div
              className={`${styles.thingListItem} ${
                oneChild ? styles.oneChild : ""
              }`}
              key={t.id}
              style={{ animationDelay: `${Math.log(index + 1) * 75}ms` }}
              onClick={() => {
                if (t.link) {
                  navigate(t.link);
                }
              }}
            >
              <Group wrap="nowrap" gap="sm" align="center">
                <div className={styles.left}>
                  {Icon && <Icon weight="fill" />}
                </div>
                <Stack
                  gap={2}
                  style={{ flex: 1, minWidth: 0 }}
                  className={styles.innerContent}
                >
                  <Group justify="space-between">
                    <Text fw="bold" size="sm" truncate="end">
                      {t.title}
                    </Text>
                    {t.createdAt && (
                      <Text
                        size="xs"
                        c="dimmed"
                        fw="bold"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {formatDateShort(t.createdAt)}
                      </Text>
                    )}
                  </Group>
                  <Text size="sm" lineClamp={1} truncate="end" c="dimmed">
                    {t.detail}
                  </Text>
                </Stack>
              </Group>
            </div>
          </ContextMenuWrapper>
        );
      })}
    </div>
  );
}

function ThingGrid({ things }: IThingTableProps) {
  return (
    <div className={styles.thingGrid}>
      {things.map((thing, index) => (
        <div
          key={thing.id}
          className={styles.thingGridItem}
          style={{ animationDelay: `${Math.log(index + 1) * 75}ms` }}
        >
          <GridCard {...thing} />
        </div>
      ))}
    </div>
  );
}
