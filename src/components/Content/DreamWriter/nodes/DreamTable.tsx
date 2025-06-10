import { NodeViewProps } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import styles from "./styles/DreamTable.module.scss";
import Table from "@tiptap/extension-table";
import { useState, useEffect, useRef, useCallback } from "react";
import { 
  ActionIcon, 
  Flex, 
  Group, 
  Stack, 
  Menu, 
  Button, 
  Divider,
  Tooltip,
  Box,
  Paper,
  Select,
  ColorPicker,
  Popover,
  NumberInput,
  Switch,
  Text
} from "@mantine/core";
import {
  ArrowLineDownIcon,
  ArrowLineRightIcon,
  PlusIcon,
  TrashIcon,
  ArrowsOutIcon,
  DotsThreeIcon,
  CopyIcon,
  ScissorsIcon,
  ClipboardIcon,
  PaintBrushIcon,
  AlignLeftIcon,
  TextAlignCenterIcon,
  AlignRightIcon,
  TableIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CellSignalFullIcon,
  SplitHorizontalIcon,
  SplitVerticalIcon
} from "@phosphor-icons/react";
import { useTableOperations } from "./hooks/useTableOperations";
import { TableContextMenu } from "./components/TableContextMenu";

interface TableControlsProps {
  editor: any;
  node: any;
  hovering: boolean;
  selectedCell: any;
  selectedRange: any;
  operations: any;
  tableStyle: any;
  onStyleChange: (style: any) => void;
}

const TableControls: React.FC<TableControlsProps> = ({ 
  editor, 
  node, 
  hovering, 
  selectedCell,
  selectedRange,
  operations,
  tableStyle,
  onStyleChange
}) => {
  const [menuOpened, setMenuOpened] = useState(false);
  const [stylePopoverOpened, setStylePopoverOpened] = useState(false);

  return (
    <div className={`${styles.tableControls} ${hovering ? styles.visible : ''}`}>
      {/* Top Row Controls */}
      <div className={styles.topControls}>
        <Flex gap="xs" align="center">
          <Tooltip label="Add row above">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={operations.addRowBefore}
            >
              <ArrowUpIcon />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Add row below">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={operations.addRowAfter}
            >
              <ArrowDownIcon />
            </ActionIcon>
          </Tooltip>
          <Divider orientation="vertical" />
          <Tooltip label="Add column before">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={operations.addColumnBefore}
            >
              <ArrowLeftIcon />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Add column after">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={operations.addColumnAfter}
            >
              <ArrowRightIcon />
            </ActionIcon>
          </Tooltip>
          <Divider orientation="vertical" />
          
          <Menu opened={menuOpened} onChange={setMenuOpened}>
            <Menu.Target>
              <ActionIcon variant="subtle" size="sm">
                <DotsThreeIcon />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Row Actions</Menu.Label>
              <Menu.Item 
                leftSection={<TrashIcon size={14} />}
                onClick={operations.deleteRow}
                color="red"
              >
                Delete Row
              </Menu.Item>
              
              <Menu.Label>Column Actions</Menu.Label>
              <Menu.Item 
                leftSection={<TrashIcon size={14} />}
                onClick={operations.deleteColumn}
                color="red"
              >
                Delete Column
              </Menu.Item>
              
              <Menu.Divider />
              
              <Menu.Label>Cell Actions</Menu.Label>
              <Menu.Item 
                leftSection={<CellSignalFullIcon size={14} />}
                onClick={operations.mergeCells}
              >
                Merge Cells
              </Menu.Item>
              <Menu.Item 
                leftSection={<SplitHorizontalIcon size={14} />}
                onClick={operations.splitCell}
              >
                Split Cell
              </Menu.Item>
              
              <Menu.Divider />
              
              <Menu.Label>Headers</Menu.Label>
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
              
              <Menu.Divider />
              
              <Menu.Label>Table</Menu.Label>
              <Menu.Item 
                leftSection={<TrashIcon size={14} />}
                onClick={operations.deleteTable}
                color="red"
              >
                Delete Table
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <Popover opened={stylePopoverOpened} onChange={setStylePopoverOpened}>
            <Popover.Target>
              <ActionIcon variant="subtle" size="sm">
                <PaintBrushIcon />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="md" style={{ minWidth: 250 }}>
                <Text size="sm" fw={500}>Table Styling</Text>
                
                <Group>
                  <Text size="xs">Border Color:</Text>
                  <ColorPicker
                    size="xs"
                    value={tableStyle.borderColor}
                    onChange={(color) => onStyleChange({ borderColor: color })}
                  />
                </Group>
                
                <NumberInput
                  label="Border Width"
                  size="xs"
                  value={tableStyle.borderWidth}
                  onChange={(value) => onStyleChange({ borderWidth: Number(value) })}
                  min={0}
                  max={5}
                />
                
                <Group>
                  <Text size="xs">Background:</Text>
                  <ColorPicker
                    size="xs"
                    value={tableStyle.backgroundColor}
                    onChange={(color) => onStyleChange({ backgroundColor: color })}
                  />
                </Group>
                
                <Switch
                  label="Striped Rows"
                  size="xs"
                  checked={tableStyle.stripedRows}
                  onChange={(event) => onStyleChange({ stripedRows: event.currentTarget.checked })}
                />
                
                <Switch
                  label="Compact Mode"
                  size="xs"
                  checked={tableStyle.compact}
                  onChange={(event) => onStyleChange({ compact: event.currentTarget.checked })}
                />
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Flex>
      </div>

      {/* Cell Alignment Controls */}
      {selectedCell && (
        <div className={styles.cellControls}>
          <Flex gap="xs" align="center">
            <Text size="xs" color="dimmed">Cell:</Text>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => operations.setCellAlignment('left')}
            >
              <AlignLeftIcon />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => operations.setCellAlignment('center')}
            >
              <TextAlignCenterIcon />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => operations.setCellAlignment('right')}
            >
              <AlignRightIcon />
            </ActionIcon>
          </Flex>
        </div>
      )}
    </div>
  );
};

const ResizeHandle: React.FC<{
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
}> = ({ direction, onResize }) => {
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = direction === 'horizontal' 
        ? e.clientX - startPos.current.x 
        : e.clientY - startPos.current.y;
      onResize(delta);
      startPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [direction, onResize]);

  return (
    <div
      className={`${styles.resizeHandle} ${styles[direction]} ${isResizing ? styles.resizing : ''}`}
      onMouseDown={handleMouseDown}
    />
  );
};

export const DreamTable = Table.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DreamTableNodeView, {
      as: "div",
      contentDOMElementTag: "table",
    });
  },
});

export const DreamTableNodeView: React.FC<NodeViewProps> = ({
  node,
  editor,
  getPos,
  updateAttributes,
}) => {
  const tableOperations = useTableOperations({
    editor,
    node,
    getPos,
    updateAttributes,
  });

  const [contextMenuOpened, setContextMenuOpened] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuOpened(true);
  }, []);

  const handleResize = useCallback((direction: 'horizontal' | 'vertical', delta: number) => {
    if (direction === 'horizontal') {
      const currentWidth = tableOperations.tableRef.current?.offsetWidth || 0;
      const newWidth = Math.max(200, currentWidth + delta);
      tableOperations.resizeTable(newWidth, 0);
    } else {
      const currentHeight = tableOperations.tableRef.current?.offsetHeight || 0;
      const newHeight = Math.max(100, currentHeight + delta);
      tableOperations.resizeTable(0, newHeight);
    }
  }, [tableOperations]);

  return (
    <>
      <NodeViewWrapper
        ref={tableOperations.tableRef}
        className={`${styles.dreamTableWrapper} ${tableOperations.hovering ? styles.hovering : ''}`}
        onMouseEnter={() => tableOperations.setHovering(true)}
        onMouseLeave={() => tableOperations.setHovering(false)}
        onContextMenu={handleContextMenu}
        style={{ 
          width: tableOperations.tableDimensions.width, 
          height: tableOperations.tableDimensions.height 
        }}
      >
        <div className={styles.tableContainer}>
          <TableControls
            editor={editor}
            node={node}
            hovering={tableOperations.hovering}
            selectedCell={tableOperations.selectedCell}
            selectedRange={tableOperations.selectedRange}
            operations={tableOperations}
            tableStyle={tableOperations.tableStyle}
            onStyleChange={tableOperations.applyTableStyle}
          />
          
          <div className={styles.tableWrapper}>
            <NodeViewContent className={styles.tableContent} />
            
            {/* Resize Handles */}
            <ResizeHandle
              direction="horizontal"
              onResize={(delta) => handleResize('horizontal', delta)}
            />
            <ResizeHandle
              direction="vertical"
              onResize={(delta) => handleResize('vertical', delta)}
            />
          </div>
        </div>

        {/* Selection Indicator */}
        {tableOperations.selectedCell && (
          <div className={styles.selectionIndicator}>
            <Text size="xs" color="blue">
              Cell {tableOperations.selectedCell.row + 1},{tableOperations.selectedCell.col + 1} selected
            </Text>
          </div>
        )}
      </NodeViewWrapper>

      <TableContextMenu
        opened={contextMenuOpened}
        onClose={() => setContextMenuOpened(false)}
        position={contextMenuPosition}
        operations={tableOperations}
        selectedCell={tableOperations.selectedCell}
        selectedRange={tableOperations.selectedRange}
        tableStyle={tableOperations.tableStyle}
        onStyleChange={tableOperations.applyTableStyle}
      />
    </>
  );
};