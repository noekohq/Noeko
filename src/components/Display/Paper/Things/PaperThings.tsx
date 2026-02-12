import React, { useMemo, useState } from "react";
import styles from "./PaperThings.module.scss";
import { IThing } from "./things";
import { Group, Stack, Text, Title } from "@mantine/core";
import { formatDateShort } from "../../../../utils/formatting";
import IconToggle from "../../Interactions/Toggle/IconToggle";
import ContextMenuWrapper from "./ContextMenuWrapper";
import GridCard from "./GridCard";
import { Icon, MagnifyingGlassIcon, ArrowUpIcon, ArrowDownIcon } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router";
import { useLayout } from "../../../../contexts/LayoutContext";
import { IComponentFilter, useSearch } from "../../../../contexts/SearchContext";
import PaperIcon from "../PaperIcon";
import PaperInput from "../PaperInput";
import PaperSelect from "../PaperSelect";

interface IPaperThingsProps {
  things: IThing[];
  modes: {
    value: string;
    icon: Icon;
  }[];
  defaultMode?: string;
  customViews?: Record<string, React.ReactNode>;
  storageKey?: string;
}

export default function PaperThings({
  things,
  modes,
  defaultMode,
  customViews,
  storageKey,
}: IPaperThingsProps) {
  if (modes.length === 0) {
    throw new Error("No modes provided");
  }

  const { isMobile } = useLayout();
  const searchContext = useSearch();

  const [mode, setMode] = useState(defaultMode || modes[0].value);

  const getInitialFilters = (): IComponentFilter => {
    if (storageKey) {
      return searchContext.component.getFilter(storageKey) || {};
    }
    return {};
  };

  const [filters, setFilters] = useState<IComponentFilter>(getInitialFilters());

  const handleFilterChange = (newFilters: IComponentFilter) => {
    setFilters(newFilters);
    if (storageKey) {
      searchContext.component.setFilter(storageKey, newFilters);
    }
  };

  const { query: filterQuery = "", sort } = filters;

  const filteredAndSortedThings = useMemo(() => {
    let processedThings = [...things];

    // Filtering
    if (filterQuery.trim()) {
      const query = filterQuery.toLowerCase();
      processedThings = processedThings.filter((thing) => {
        const titleMatch = thing.title?.toLowerCase().includes(query);
        const detailMatch =
          typeof thing.detail === "string" ? thing.detail.toLowerCase().includes(query) : false;
        return titleMatch || detailMatch;
      });
    }

    // Sorting
    if (sort?.field) {
      const { field, direction } = sort;
      processedThings.sort((a, b) => {
        const valA = a[field as keyof IThing];
        const valB = b[field as keyof IThing];
        const dir = direction === "asc" ? 1 : -1;

        if (valA === undefined || valB === undefined) {
          if (valA === undefined && valB === undefined) return 0;
          return (valA === undefined ? 1 : -1) * dir;
        }

        if (field === "createdAt" || field === "updatedAt") {
          return (new Date(valA as string).getTime() - new Date(valB as string).getTime()) * dir;
        }

        if (typeof valA === "string" && typeof valB === "string") {
          return valA.localeCompare(valB) * dir;
        }

        return 0;
      });
    }

    return processedThings;
  }, [things, filterQuery, sort]);

  const builtInViews: Record<string, React.FC<{ things: IThing[] }>> = {
    list: ThingList,
    grid: ThingGrid,
  };

  const sortOptions = [
    { value: "title", label: "Title" },
    { value: "createdAt", label: "Created" },
    { value: "updatedAt", label: "Updated" },
  ];

  const ViewComponent = builtInViews[mode];
  const CustomView = customViews?.[mode];

  const filterInput = (
    <PaperInput
      value={filterQuery}
      onChange={(event) =>
        handleFilterChange({
          ...filters,
          query: event.currentTarget.value,
        })
      }
      placeholder="Filter items..."
      leftSection={<MagnifyingGlassIcon />}
      className={styles.filterInput}
    />
  );

  const sortControls = (
    <Group gap="xs" wrap="nowrap">
      <PaperSelect
        placeholder="Sort by..."
        data={sortOptions}
        value={sort?.field || null}
        onChange={(value) => {
          handleFilterChange({
            ...filters,
            sort: { field: value, direction: sort?.direction || "asc" },
          });
        }}
        onClear={() => {
          const { sort, ...rest } = filters;
          handleFilterChange(rest);
        }}
      />
      <PaperIcon
        aria-label="Toggle sort direction"
        onClick={() => {
          if (sort?.field) {
            handleFilterChange({
              ...filters,
              sort: {
                field: sort.field,
                direction: sort.direction === "asc" ? "desc" : "asc",
              },
            });
          }
        }}
        disabled={!sort?.field}
      >
        {sort?.direction === "asc" ? (
          <ArrowUpIcon weight="bold" />
        ) : (
          <ArrowDownIcon weight="bold" />
        )}
      </PaperIcon>
    </Group>
  );

  const viewToggle = (
    <IconToggle
      options={modes}
      value={mode}
      onChange={(v) => {
        setMode(v);
      }}
    />
  );

  return (
    <div className={styles.paperThings}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Title order={2}>
            {filteredAndSortedThings.length} Item
            {filteredAndSortedThings.length === 1 ? "" : "s"}
          </Title>
          {isMobile ? (
            <Stack w="100%" gap="md">
              {filterInput}
              <Group justify="space-between">
                {sortControls}
                {viewToggle}
              </Group>
            </Stack>
          ) : (
            <Group>
              {filterInput}
              {sortControls}
              {viewToggle}
            </Group>
          )}
        </Group>
        <div className={styles.content}>
          {CustomView ? (
            CustomView
          ) : ViewComponent ? (
            <ViewComponent things={filteredAndSortedThings} />
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
              className={`${styles.thingListItem} ${oneChild ? styles.oneChild : ""}`}
              key={t.id}
              style={{ animationDelay: `${Math.log(index + 1) * 75}ms` }}
              onClick={() => {
                if (t.link) {
                  navigate(t.link);
                }
              }}
            >
              <Group wrap="nowrap" gap="sm" align="center">
                <div className={styles.left}>{Icon && <Icon weight="fill" />}</div>
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }} className={styles.innerContent}>
                  <Group justify="space-between">
                    <Text fw="bold" size="sm" truncate="end">
                      {t.title}
                    </Text>
                    {t.createdAt && (
                      <Text size="xs" c="dimmed" fw="bold" style={{ whiteSpace: "nowrap" }}>
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
