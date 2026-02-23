import { mergeAttributes, Node, NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Table, TextInput, Button, Group, ActionIcon } from "@mantine/core";
import React, { useState, useEffect, useCallback } from "react";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import styles from '@core/design/styles/DreamTable.module.scss';
import {
  DreamTableSchema,
  IDreamTableOptions,
  ITableDataType,
  initializeTableData,
} from '../../../shared/editing/tiptap/nodes/DreamTable';

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamTable: {
      setDreamTable: (options: { columns: number; rows: number }) => ReturnType;
    };
  }
}

export const DreamTable = DreamTableSchema.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DreamTableComponent);
  },
});

const DreamTableComponent: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
  const getParsedTableData = (): ITableDataType => {
    try {
      const dataString = node.attrs.tableData;
      if (!dataString || typeof dataString !== "string") {
        return initializeTableData(2, 2);
      }
      const rawParsed = JSON.parse(dataString);

      if (rawParsed && Array.isArray(rawParsed.headers) && Array.isArray(rawParsed.rows)) {
        const Rcols = rawParsed.headers.length;
        if (Rcols === 0 && rawParsed.rows.length === 0) return initializeTableData(1, 1);
        if (Rcols > 0 && rawParsed.rows.every((r: any) => Array.isArray(r) && r.length === Rcols)) {
          return rawParsed as ITableDataType;
        }
      } else if (
        rawParsed &&
        typeof rawParsed.columns === "number" &&
        typeof rawParsed.rows === "number"
      ) {
        return initializeTableData(rawParsed.columns, rawParsed.rows);
      }
      console.warn("Unrecognized table data format, initializing default table:", dataString);
      return initializeTableData(2, 2);
    } catch (error) {
      console.error(
        "Error parsing tableData, initializing default table:",
        error,
        node.attrs.tableData
      );
      return initializeTableData(2, 2);
    }
  };

  const [tableState, setTableState] = useState<ITableDataType>(getParsedTableData());

  const persistChanges = useCallback(
    (newData: ITableDataType) => {
      updateAttributes({ tableData: JSON.stringify(newData) });
    },
    [updateAttributes]
  );

  useEffect(() => {
    const currentAttrData = node.attrs.tableData;
    if (currentAttrData !== JSON.stringify(tableState)) {
      setTableState(getParsedTableData());
    }
  }, [node.attrs.tableData]);

  const handleHeaderChange = (index: number, value: string) => {
    const newHeaders = [...tableState.headers];
    newHeaders[index] = value;
    const newState = { ...tableState, headers: newHeaders };
    setTableState(newState);
    persistChanges(newState);
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = tableState.rows.map((row, rIdx) =>
      rIdx === rowIndex ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell)) : row
    );
    const newState = { ...tableState, rows: newRows };
    setTableState(newState);
    persistChanges(newState);
  };

  const addRow = () => {
    const columnCount = tableState.headers.length || 1;
    const newRow = Array(columnCount).fill("");
    const newState = {
      ...tableState,
      rows: [...tableState.rows, newRow],
    };
    setTableState(newState);
    persistChanges(newState);
  };

  const removeRow = (rowIndex: number) => {
    if (tableState.rows.length <= 1 && editor.isEditable) return;
    const newRows = tableState.rows.filter((_, idx) => idx !== rowIndex);
    const newState = { ...tableState, rows: newRows };
    setTableState(newState);
    persistChanges(newState);
  };

  const addColumn = () => {
    const newHeaders = [...tableState.headers, `Header ${tableState.headers.length + 1}`];
    const newRows = tableState.rows.map((row) => [...row, ""]);
    const newState = { headers: newHeaders, rows: newRows };
    setTableState(newState);
    persistChanges(newState);
  };

  const removeColumn = (colIndex: number) => {
    if (tableState.headers.length <= 1 && editor.isEditable) return;
    const newHeaders = tableState.headers.filter((_, idx) => idx !== colIndex);
    const newRows = tableState.rows.map((row) => row.filter((_, idx) => idx !== colIndex));
    const newState = { headers: newHeaders, rows: newRows };
    setTableState(newState);
    persistChanges(newState);
  };

  if (!editor.isEditable) {
    return (
      <NodeViewWrapper style={{ padding: "0.5rem", margin: "0.5rem 0" }}>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              {tableState.headers.map((header, index) => (
                <Table.Th key={`header-${index}`}>{header}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {tableState.rows.map((row, rowIndex) => (
              <Table.Tr key={`row-${rowIndex}`}>
                {row.map((cell, colIndex) => (
                  <Table.Td key={`cell-${rowIndex}-${colIndex}`}>{cell}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className={styles.container}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {tableState.headers.map((header, index) => (
                <th
                  key={`header-edit-${index}`}
                  style={{ position: "relative", minWidth: "120px" }}
                >
                  <Group gap="xs" wrap="nowrap">
                    {tableState.headers.length > 1 && editor.isEditable && (
                      <ActionIcon
                        variant="subtle"
                        color="dark.4"
                        size="xs"
                        onClick={() => removeColumn(index)}
                        title="Remove column"
                        disabled={!editor.isEditable}
                      >
                        <XIcon weight="bold" size={12} />
                      </ActionIcon>
                    )}
                    <TextInput
                      value={header}
                      onChange={(event) => handleHeaderChange(index, event.currentTarget.value)}
                      variant="unstyled"
                      styles={{
                        input: {
                          fontWeight: "bold",
                          paddingRight: tableState.headers.length > 1 ? "28px" : "4px",
                        },
                      }}
                      disabled={!editor.isEditable}
                    />
                  </Group>
                </th>
              ))}
              {editor.isEditable && <th style={{ width: "50px", padding: 0 }} />}
            </tr>
          </thead>
          <tbody>
            {tableState.rows.map((row, rowIndex) => (
              <tr key={`row-edit-${rowIndex}`}>
                {row.map((cell, colIndex) => (
                  <td key={`cell-edit-${rowIndex}-${colIndex}`} style={{ minWidth: "100px" }}>
                    <TextInput
                      value={cell}
                      onChange={(event) =>
                        handleCellChange(rowIndex, colIndex, event.currentTarget.value)
                      }
                      variant="unstyled"
                      disabled={!editor.isEditable}
                    />
                  </td>
                ))}
                {editor.isEditable && (
                  <td style={{ padding: "0 4px", textAlign: "center" }}>
                    {tableState.rows.length > 1 && (
                      <ActionIcon
                        variant="subtle"
                        color="gray.4"
                        onClick={() => removeRow(rowIndex)}
                        title="Remove row"
                        disabled={!editor.isEditable}
                      >
                        <XIcon size={12} />
                      </ActionIcon>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.options}>
        <Group justify="center" mt="xs">
          <Button
            onClick={addColumn}
            size="xs"
            variant="light"
            color="gray"
            disabled={!editor.isEditable}
            rightSection={<PlusIcon size={14} />}
          >
            Column
          </Button>
          <Button
            onClick={addRow}
            size="xs"
            variant="light"
            color="gray"
            disabled={!editor.isEditable}
            rightSection={<PlusIcon size={14} />}
          >
            Row
          </Button>
        </Group>
      </div>
    </NodeViewWrapper>
  );
};
