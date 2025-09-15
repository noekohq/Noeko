import type { ReactNode } from "react";

/**
 * Defines the configuration for a single column in the GoodTable.
 * @template T - The type of the data object for a row.
 */
export interface IGoodTableColumn<T> {
  /** The key from the data object to access the cell's value. */
  accessor: keyof T;

  /** The text displayed in the column header. */
  header: string;

  /** Optional: Enables sorting for this column. Defaults to false. */
  sortable?: boolean;

  /**
   * Optional: A custom render function for the cell content.
   * If not provided, it will render the raw value.
   * @param item - The entire data object for the current row.
   * @returns The ReactNode to render in the cell.
   */
  render?: (item: T) => ReactNode;

  /**
   * Optional: Defines the display priority for responsiveness.
   * Lower numbers are higher priority and remain visible on smaller screens.
   * e.g., 1 = always visible, 2 = visible on tablets and up, 3 = desktop only.
   * If undefined, it's treated as the lowest priority.
   */
  priority?: number;
}

/**
 * Defines the props for the GoodTable component.
 * @template T - A generic type for the data, must be an object.
 */
export interface IGoodTableProps<T extends Record<string, any>> {
  /** The array of data objects to display in the table. */
  data: T[];

  /** The configuration for the table columns. */
  columns: IGoodTableColumn<T>[];

  /** Optional: Initial sort configuration. */
  initialSort?: {
    accessor: keyof T;
    direction: "asc" | "desc";
  };
}
