import React, { useState } from 'react';
import {
  Menu,
  Divider,
  Text,
  Group,
  Stack,
  ActionIcon,
  ColorPicker,
  NumberInput,
  Switch,
  Button,
  FileButton,
  Modal,
  Textarea,
  Select,
  Tooltip,
  Alert,
} from '@mantine/core';
import {
  DotsThreeVerticalIcon,
  TrashIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CopyIcon,
  ScissorsIcon,
  ClipboardIcon,
  PaintBrushIcon,
  AlignLeftIcon,
  TextAlignCenterIcon,
  AlignRightIcon,
  CellSignalFullIcon,
  SplitHorizontalIcon,
  SplitVerticalIcon,
  TableIcon,
  DownloadIcon,
  UploadIcon,
  GridFourIcon,
  ArrowsOutIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  FileTextIcon,
  FileCsvIcon,
  FileIcon,
  InfoIcon,
} from '@phosphor-icons/react';
import { TableOperations, TablePosition, TableSelection, TableStyle } from '../hooks/useTableOperations';

interface TableContextMenuProps {
  opened: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  operations: TableOperations;
  selectedCell: TablePosition | null;
  selectedRange: TableSelection | null;
  tableStyle: TableStyle;
  onStyleChange: (style: Partial<TableStyle>) => void;
}

export const TableContextMenu: React.FC<TableContextMenuProps> = ({
  opened,
  onClose,
  position,
  operations,
  selectedCell,
  selectedRange,
  tableStyle,
  onStyleChange,
}) => {
  const [styleModalOpened, setStyleModalOpened] = useState(false);
  const [importModalOpened, setImportModalOpened] = useState(false);
  const [exportModalOpened, setExportModalOpened] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  const handleExport = () => {
    if (exportFormat === 'csv') {
      const csv = operations.exportToCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'table.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const json = operations.exportToJSON();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'table.json';
      a.click();
      URL.revokeObjectURL(url);
    }
    setExportModalOpened(false);
  };

  const handleImport = () => {
    if (csvContent.trim()) {
      operations.importFromCSV(csvContent);
      setCsvContent('');
      setImportModalOpened(false);
    }
  };

  const handleFileImport = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvContent(content);
      };
      reader.readAsText(file);
    }
  };

  const hasSelection = selectedCell || selectedRange;
  const hasMultipleSelection = selectedRange && (
    selectedRange.start.row !== selectedRange.end.row ||
    selectedRange.start.col !== selectedRange.end.col
  );

  return (
    <>
      <Menu
        opened={opened}
        onClose={onClose}
        position="bottom-start"
        withArrow
        shadow="md"
        width={280}
      >
        <Menu.Target>
          <div
            style={{
              position: 'fixed',
              top: position.y,
              left: position.x,
              width: 1,
              height: 1,
              pointerEvents: 'none',
            }}
          />
        </Menu.Target>

        <Menu.Dropdown>
          {/* Row Operations */}
          <Menu.Label>Row Operations</Menu.Label>
          <Menu.Item
            leftSection={<PlusIcon size={14} />}
            onClick={operations.addRowBefore}
          >
            Add Row Above
          </Menu.Item>
          <Menu.Item
            leftSection={<PlusIcon size={14} />}
            onClick={operations.addRowAfter}
          >
            Add Row Below
          </Menu.Item>
          <Menu.Item
            leftSection={<CopyIcon size={14} />}
            onClick={operations.duplicateRow}
            disabled={!selectedCell}
          >
            Duplicate Row
          </Menu.Item>
          <Menu.Item
            leftSection={<ArrowUpIcon size={14} />}
            onClick={operations.moveRowUp}
            disabled={!selectedCell || selectedCell.row === 0}
          >
            Move Row Up
          </Menu.Item>
          <Menu.Item
            leftSection={<ArrowDownIcon size={14} />}
            onClick={operations.moveRowDown}
            disabled={!selectedCell}
          >
            Move Row Down
          </Menu.Item>
          <Menu.Item
            leftSection={<TrashIcon size={14} />}
            onClick={operations.deleteRow}
            color="red"
          >
            Delete Row
          </Menu.Item>

          <Menu.Divider />

          {/* Column Operations */}
          <Menu.Label>Column Operations</Menu.Label>
          <Menu.Item
            leftSection={<PlusIcon size={14} />}
            onClick={operations.addColumnBefore}
          >
            Add Column Before
          </Menu.Item>
          <Menu.Item
            leftSection={<PlusIcon size={14} />}
            onClick={operations.addColumnAfter}
          >
            Add Column After
          </Menu.Item>
          <Menu.Item
            leftSection={<CopyIcon size={14} />}
            onClick={operations.duplicateColumn}
            disabled={!selectedCell}
          >
            Duplicate Column
          </Menu.Item>
          <Menu.Item
            leftSection={<ArrowLeftIcon size={14} />}
            onClick={operations.moveColumnLeft}
            disabled={!selectedCell || selectedCell.col === 0}
          >
            Move Column Left
          </Menu.Item>
          <Menu.Item
            leftSection={<ArrowRightIcon size={14} />}
            onClick={operations.moveColumnRight}
            disabled={!selectedCell}
          >
            Move Column Right
          </Menu.Item>
          <Menu.Item
            leftSection={<TrashIcon size={14} />}
            onClick={operations.deleteColumn}
            color="red"
          >
            Delete Column
          </Menu.Item>

          <Menu.Divider />

          {/* Cell Operations */}
          <Menu.Label>Cell Operations</Menu.Label>
          <Menu.Item
            leftSection={<TextAlignLeftIcon size={14} />}
            onClick={() => operations.setCellAlignment('left')}
            disabled={!hasSelection}
          >
            Align Left
          </Menu.Item>
          <Menu.Item
            leftSection={<TextAlignCenterIcon size={14} />}
            onClick={() => operations.setCellAlignment('center')}
            disabled={!hasSelection}
          >
            Align Center
          </Menu.Item>
          <Menu.Item
            leftSection={<TextAlignRightIcon size={14} />}
            onClick={() => operations.setCellAlignment('right')}
            disabled={!hasSelection}
          >
            Align Right
          </Menu.Item>
          <Menu.Item
            leftSection={<CellSignalFullIcon size={14} />}
            onClick={operations.mergeCells}
            disabled={!hasMultipleSelection}
          >
            Merge Cells
          </Menu.Item>
          <Menu.Item
            leftSection={<SplitHorizontalIcon size={14} />}
            onClick={operations.splitCell}
            disabled={!selectedCell}
          >
            Split Cell
          </Menu.Item>
          <Menu.Item
            leftSection={<PaintBrushIcon size={14} />}
            onClick={operations.clearCellFormatting}
            disabled={!hasSelection}
          >
            Clear Formatting
          </Menu.Item>

          <Menu.Divider />

          {/* Selection Operations */}
          <Menu.Label>Selection</Menu.Label>
          <Menu.Item
            leftSection={<GridFourIcon size={14} />}
            onClick={() => selectedCell && operations.selectRow(selectedCell.row)}
            disabled={!selectedCell}
          >
            Select Row
          </Menu.Item>
          <Menu.Item
            leftSection={<GridFourIcon size={14} />}
            onClick={() => selectedCell && operations.selectColumn(selectedCell.col)}
            disabled={!selectedCell}
          >
            Select Column
          </Menu.Item>
          <Menu.Item
            leftSection={<TableIcon size={14} />}
            onClick={operations.selectTable}
          >
            Select Table
          </Menu.Item>
          <Menu.Item
            leftSection={<ArrowsOutIcon size={14} />}
            onClick={operations.clearSelection}
            disabled={!hasSelection}
          >
            Clear Selection
          </Menu.Item>

          <Menu.Divider />

          {/* Table Operations */}
          <Menu.Label>Table Operations</Menu.Label>
          <Menu.Item
            leftSection={<TableIcon size={14} />}
            onClick={operations.toggleHeaderRow}
          >
            Toggle Header Row
          </Menu.Item>
          <Menu.Item
            leftSection={<TableIcon size={14} />}
            onClick={operations.toggleHeaderColumn}
          >
            Toggle Header Column
          </Menu.Item>
          <Menu.Item
            leftSection={<PaintBrushIcon size={14} />}
            onClick={() => setStyleModalOpened(true)}
          >
            Table Styling
          </Menu.Item>

          <Menu.Divider />

          {/* Import/Export */}
          <Menu.Label>Import/Export</Menu.Label>
          <Menu.Item
            leftSection={<UploadIcon size={14} />}
            onClick={() => setImportModalOpened(true)}
          >
            Import Data
          </Menu.Item>
          <Menu.Item
            leftSection={<DownloadIcon size={14} />}
            onClick={() => setExportModalOpened(true)}
          >
            Export Data
          </Menu.Item>

          <Menu.Divider />

          {/* Danger Zone */}
          <Menu.Label>Danger Zone</Menu.Label>
          <Menu.Item
            leftSection={<TrashIcon size={14} />}
            onClick={operations.deleteTable}
            color="red"
          >
            Delete Table
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {/* Style Modal */}
      <Modal
        opened={styleModalOpened}
        onClose={() => setStyleModalOpened(false)}
        title="Table Styling"
        size="md"
      >
        <Stack gap="lg">
          <Group>
            <Text size="sm" fw={500}>Borders</Text>
            <ColorPicker
              value={tableStyle.borderColor}
              onChange={(color) => onStyleChange({ borderColor: color })}
              size="sm"
            />
          </Group>

          <NumberInput
            label="Border Width"
            value={tableStyle.borderWidth}
            onChange={(value) => onStyleChange({ borderWidth: Number(value) })}
            min={0}
            max={10}
            size="sm"
          />

          <Group>
            <Text size="sm" fw={500}>Background</Text>
            <ColorPicker
              value={tableStyle.backgroundColor}
              onChange={(color) => onStyleChange({ backgroundColor: color })}
              size="sm"
            />
          </Group>

          <Group>
            <Text size="sm" fw={500}>Header Background</Text>
            <ColorPicker
              value={tableStyle.headerBg}
              onChange={(color) => onStyleChange({ headerBg: color })}
              size="sm"
            />
          </Group>

          <Switch
            label="Striped Rows"
            checked={tableStyle.stripedRows}
            onChange={(event) => onStyleChange({ stripedRows: event.currentTarget.checked })}
          />

          <Switch
            label="Compact Mode"
            checked={tableStyle.compact}
            onChange={(event) => onStyleChange({ compact: event.currentTarget.checked })}
          />

          <Select
            label="Default Alignment"
            value={tableStyle.alignment}
            onChange={(value) => onStyleChange({ alignment: value as 'left' | 'center' | 'right' })}
            data={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ]}
          />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setStyleModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={() => setStyleModalOpened(false)}>
              Apply
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Import Modal */}
      <Modal
        opened={importModalOpened}
        onClose={() => setImportModalOpened(false)}
        title="Import Table Data"
        size="lg"
      >
        <Stack gap="lg">
          <Alert icon={<InfoIcon size={16} />} title="Import Information">
            You can import CSV data to populate your table. The first row will be treated as headers.
          </Alert>

          <Group>
            <FileButton onChange={handleFileImport} accept=".csv,.txt">
              {(props) => (
                <Button leftSection={<FileIcon size={16} />} {...props}>
                  Choose File
                </Button>
              )}
            </FileButton>
            <Text size="sm" color="dimmed">
              or paste CSV data below
            </Text>
          </Group>

          <Textarea
            label="CSV Data"
            placeholder="Name,Age,City&#10;John,30,New York&#10;Jane,25,Los Angeles"
            value={csvContent}
            onChange={(event) => setCsvContent(event.currentTarget.value)}
            minRows={6}
            maxRows={10}
          />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setImportModalOpened(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!csvContent.trim()}
              leftSection={<UploadIcon size={16} />}
            >
              Import
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Export Modal */}
      <Modal
        opened={exportModalOpened}
        onClose={() => setExportModalOpened(false)}
        title="Export Table Data"
        size="md"
      >
        <Stack gap="lg">
          <Select
            label="Export Format"
            value={exportFormat}
            onChange={(value) => setExportFormat(value as 'csv' | 'json')}
            data={[
              { value: 'csv', label: 'CSV (Comma Separated Values)' },
              { value: 'json', label: 'JSON (JavaScript Object Notation)' },
            ]}
          />

          <Text size="sm" color="dimmed">
            {exportFormat === 'csv' 
              ? 'Export as CSV file that can be opened in Excel or other spreadsheet applications.'
              : 'Export as JSON file with table structure and styling information.'
            }
          </Text>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setExportModalOpened(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              leftSection={<DownloadIcon size={16} />}
            >
              Export
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default TableContextMenu;