import { useMemo, useState } from "react";
import {
  Table,
  TextInput,
  UnstyledButton,
  Group,
  Text,
  Center,
  Box,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
// Changed import from @tabler/icons-react to @phosphor-icons/react
import {
  MagnifyingGlassIcon,
  CaretUpDownIcon,
  CaretDownIcon,
  CaretUpIcon,
} from "@phosphor-icons/react";
import type { IGoodTableProps, IGoodTableColumn } from "./GoodTable.d";

// Define a sort direction type
type SortDirection = "asc" | "desc";

export default function GoodTable<T extends Record<string, any>>({
  data,
  columns,
  initialSort,
}: IGoodTableProps<T>) {
  // State for search query and sorting configuration
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    accessor: keyof T;
    direction: SortDirection;
  } | null>(initialSort ?? null);

  // Responsive breakpoints using Mantine's hook
  const isTablet = useMediaQuery("(min-width: 768px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Filter columns based on screen size and priority
  const visibleColumns = useMemo(() => {
    return columns.filter((column) => {
      if (!column.priority) return isDesktop; // Default to desktop-only if no priority
      if (isDesktop) return true; // Show all on desktop
      if (isTablet) return column.priority <= 2; // Show priority 1 & 2 on tablet
      return column.priority <= 1; // Show priority 1 on mobile
    });
  }, [columns, isTablet, isDesktop]);

  // Memoized processing of data: filtering and sorting
  const processedData = useMemo(() => {
    let filteredData = [...data];

    // 1. Filtering Logic
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filteredData = filteredData.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(lowercasedQuery),
        ),
      );
    }

    // 2. Sorting Logic
    if (sortConfig !== null) {
      filteredData.sort((a, b) => {
        const aValue = a[sortConfig.accessor];
        const bValue = b[sortConfig.accessor];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredData;
  }, [data, searchQuery, sortConfig]);

  // Handler for changing the sort column and direction
  const handleSort = (accessor: keyof T) => {
    if (!columns.find((c) => c.accessor === accessor)?.sortable) return;

    let direction: SortDirection = "asc";
    if (sortConfig?.accessor === accessor && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ accessor, direction });
  };

  // Render function for the table header with sort icons
  const renderSortIcon = (column: IGoodTableColumn<T>) => {
    if (!column.sortable) return null;
    if (sortConfig?.accessor !== column.accessor) {
      // Replaced IconSelector
      return <CaretUpDownIcon size={14} />;
    }
    // Replaced IconChevronDown and IconChevronUp
    return sortConfig.direction === "desc" ? (
      <CaretDownIcon size={14} />
    ) : (
      <CaretUpIcon size={14} />
    );
  };

  const tableHeaders = visibleColumns.map((column) => (
    <Table.Th key={String(column.accessor)}>
      <UnstyledButton
        onClick={() => handleSort(column.accessor)}
        style={{ width: "100%" }}
      >
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text fw={500} size="sm">
            {column.header}
          </Text>
          <Center>{renderSortIcon(column)}</Center>
        </Group>
      </UnstyledButton>
    </Table.Th>
  ));

  const tableRows = processedData.map((item, index) => (
    <Table.Tr key={index}>
      {visibleColumns.map((column) => (
        <Table.Td key={String(column.accessor)}>
          {column.render ? column.render(item) : String(item[column.accessor])}
        </Table.Td>
      ))}
    </Table.Tr>
  ));

  return (
    <Box>
      <TextInput
        placeholder="Search table..."
        // Replaced IconSearch
        leftSection={<MagnifyingGlassIcon size={14} />}
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.currentTarget.value)}
        mb="md"
      />
      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>{tableHeaders}</Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {tableRows.length > 0 ? (
            tableRows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={visibleColumns.length}>
                <Text ta="center" c="dimmed">
                  No data found
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
