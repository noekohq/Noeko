import { useState, useCallback, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/core';

export interface TablePosition {
  row: number;
  col: number;
}

export interface TableSelection {
  start: TablePosition;
  end: TablePosition;
}

export interface TableStyle {
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  headerBg: string;
  stripedRows: boolean;
  compact: boolean;
  alignment: 'left' | 'center' | 'right';
}

export interface TableOperations {
  // Row operations
  addRowBefore: () => void;
  addRowAfter: () => void;
  deleteRow: () => void;
  moveRowUp: () => void;
  moveRowDown: () => void;
  duplicateRow: () => void;
  
  // Column operations
  addColumnBefore: () => void;
  addColumnAfter: () => void;
  deleteColumn: () => void;
  moveColumnLeft: () => void;
  moveColumnRight: () => void;
  duplicateColumn: () => void;
  
  // Cell operations
  mergeCells: () => void;
  splitCell: () => void;
  setCellAlignment: (alignment: 'left' | 'center' | 'right') => void;
  setCellBackground: (color: string) => void;
  clearCellFormatting: () => void;
  
  // Table operations
  deleteTable: () => void;
  toggleHeaderRow: () => void;
  toggleHeaderColumn: () => void;
  resizeTable: (width: number, height: number) => void;
  
  // Selection operations
  selectCell: (position: TablePosition) => void;
  selectRow: (row: number) => void;
  selectColumn: (col: number) => void;
  selectTable: () => void;
  clearSelection: () => void;
  
  // Style operations
  applyTableStyle: (style: Partial<TableStyle>) => void;
  resetTableStyle: () => void;
  
  // Import/Export
  exportToCSV: () => string;
  exportToJSON: () => object;
  importFromCSV: (csv: string) => void;
  
  // Utility
  getTableDimensions: () => { rows: number; cols: number };
  isValidPosition: (position: TablePosition) => boolean;
  getCellContent: (position: TablePosition) => string;
  setCellContent: (position: TablePosition, content: string) => void;
}

export interface UseTableOperationsProps {
  editor: Editor;
  node: any;
  getPos: () => number;
  updateAttributes: (attributes: Record<string, any>) => void;
}

export const useTableOperations = ({
  editor,
  node,
  getPos,
  updateAttributes,
}: UseTableOperationsProps) => {
  const [selectedCell, setSelectedCell] = useState<TablePosition | null>(null);
  const [selectedRange, setSelectedRange] = useState<TableSelection | null>(null);
  const [hovering, setHovering] = useState(false);
  const [tableStyle, setTableStyle] = useState<TableStyle>({
    borderColor: '#e0e0e0',
    borderWidth: 1,
    backgroundColor: 'transparent',
    headerBg: '#f8f9fa',
    stripedRows: false,
    compact: false,
    alignment: 'left',
  });
  
  const [isResizing, setIsResizing] = useState(false);
  const [tableDimensions, setTableDimensions] = useState({ width: 'auto', height: 'auto' });
  const tableRef = useRef<HTMLElement | null>(null);
  const operationHistory = useRef<Array<{ operation: string; data: any }>>([]);

  // Calculate table dimensions from node
  const getTableDimensions = useCallback((): { rows: number; cols: number } => {
    let rows = 0;
    let cols = 0;
    
    if (node && node.content) {
      node.content.forEach((row: any) => {
        rows++;
        if (row.content && row.content.size > cols) {
          cols = row.content.size;
        }
      });
    }
    
    return { rows, cols };
  }, [node]);

  // Validate position
  const isValidPosition = useCallback((position: TablePosition): boolean => {
    const { rows, cols } = getTableDimensions();
    return position.row >= 0 && position.row < rows && 
           position.col >= 0 && position.col < cols;
  }, [getTableDimensions]);

  // Row operations
  const addRowBefore = useCallback(() => {
    if (editor && editor.chain) {
      editor.chain().focus().addRowBefore().run();
      operationHistory.current.push({ operation: 'addRowBefore', data: {} });
    }
  }, [editor]);

  const addRowAfter = useCallback(() => {
    if (editor && editor.chain) {
      editor.chain().focus().addRowAfter().run();
      operationHistory.current.push({ operation: 'addRowAfter', data: {} });
    }
  }, [editor]);

  const deleteRow = useCallback(() => {
    if (editor && editor.chain) {
      editor.chain().focus().deleteRow().run();
      operationHistory.current.push({ operation: 'deleteRow', data: {} });
    }
  }, [editor]);

  const moveRowUp = useCallback(() => {
    // Custom implementation for moving rows
    if (selectedCell && selectedCell.row > 0) {
      // This would require custom commands in the editor
      console.log('Moving row up - needs custom implementation');
    }
  }, [selectedCell]);

  const moveRowDown = useCallback(() => {
    if (selectedCell) {
      const { rows } = getTableDimensions();
      if (selectedCell.row < rows - 1) {
        console.log('Moving row down - needs custom implementation');
      }
    }
  }, [selectedCell, getTableDimensions]);

  const duplicateRow = useCallback(() => {
    // Custom implementation for duplicating rows
    console.log('Duplicating row - needs custom implementation');
  }, []);

  // Column operations
  const addColumnBefore = useCallback(() => {
    if (editor && editor.chain) {
      editor.chain().focus().addColumnBefore().run();
      operationHistory.current.push({ operation: 'addColumnBefore', data: {} });
    }
  }, [editor]);

  const addColumnAfter = useCallback(() => {
    if (editor && editor.chain) {
      editor.chain().focus().addColumnAfter().run();
      operationHistory.current.push({ operation: 'addColumnAfter', data: {} });
    }
  }, [editor]);

  const deleteColumn = useCallback(() => {
    if (editor && editor.chain) {
      editor.chain().focus().deleteColumn().run();
      operationHistory.current.push({ operation: 'deleteColumn', data: {} });
    }
  }, [editor]);

  const moveColumnLeft = useCallback(() => {
    console.log('Moving column left - needs custom implementation');
  }, []);

  const moveColumnRight = useCallback(() => {
    console.log('Moving column right - needs custom implementation');
  }, []);

  const duplicateColumn = useCallback(() => {
    console.log('Duplicating column - needs custom implementation');
  }, []);

  // Cell operations
  const mergeCells = useCallback(() => {
    if (editor && editor.chain) {
      editor.chain().focus().mergeCells().run();
      operationHistory.current.push({ operation: 'mergeCells', data: {} });
    }
  }, [editor]);

  const splitCell = useCallback(() => {
    if (editor && editor.chain) {
      editor.chain().focus().splitCell().run();
      operationHistory.current.push({ operation: 'splitCell', data: {} });
    }
  }, [editor]);

  const setCellAlignment = useCallback((alignment: 'left' | 'center' | 'right') => {
    if (editor && editor.chain) {
      editor.chain().focus().setCellAttribute('textAlign', alignment).run();
      operationHistory.current.push({ operation: 'setCellAlignment', data: { alignment } });
    }
  }, [editor]);

  const setCellBackground = useCallback((color: string) => {
    if (editor && editor.chain) {
      editor.chain().focus().setCellAttribute('backgroundColor', color).run();
      operationHistory.current.push({ operation: 'setCellBackground', data: { color } });
    }
  }, [editor]);

  const clearCellFormatting = useCallback(() => {
    if (editor && editor.chain) {
      editor.chain().focus().setCellAttribute('style', null).run();
      operationHistory.current.push({ operation: 'clearCellFormatting', data: {} });
    }
  }, [editor]);

  // Table operations
  const deleteTable = useCallback(() => {
    if (editor && editor.chain) {
      editor.chain().focus().deleteTable().run();
      operationHistory.current.push({ operation: 'deleteTable', data: {} });
    }
  }, [editor]);

  const toggleHeaderRow = useCallback(() => {
    if (editor && editor.chain) {
      editor.chain().focus().toggleHeaderRow().run();
      operationHistory.current.push({ operation: 'toggleHeaderRow', data: {} });
    }
  }, [editor]);

  const toggleHeaderColumn = useCallback(() => {
    if (editor && editor.chain) {
      editor.chain().focus().toggleHeaderColumn().run();
      operationHistory.current.push({ operation: 'toggleHeaderColumn', data: {} });
    }
  }, [editor]);

  const resizeTable = useCallback((width: number, height: number) => {
    setTableDimensions({ 
      width: width > 0 ? `${width}px` : 'auto', 
      height: height > 0 ? `${height}px` : 'auto' 
    });
    updateAttributes({ width, height });
  }, [updateAttributes]);

  // Selection operations
  const selectCell = useCallback((position: TablePosition) => {
    if (isValidPosition(position)) {
      setSelectedCell(position);
      setSelectedRange(null);
    }
  }, [isValidPosition]);

  const selectRow = useCallback((row: number) => {
    const { cols } = getTableDimensions();
    if (row >= 0 && cols > 0) {
      setSelectedRange({
        start: { row, col: 0 },
        end: { row, col: cols - 1 }
      });
      setSelectedCell(null);
    }
  }, [getTableDimensions]);

  const selectColumn = useCallback((col: number) => {
    const { rows } = getTableDimensions();
    if (col >= 0 && rows > 0) {
      setSelectedRange({
        start: { row: 0, col },
        end: { row: rows - 1, col }
      });
      setSelectedCell(null);
    }
  }, [getTableDimensions]);

  const selectTable = useCallback(() => {
    const { rows, cols } = getTableDimensions();
    if (rows > 0 && cols > 0) {
      setSelectedRange({
        start: { row: 0, col: 0 },
        end: { row: rows - 1, col: cols - 1 }
      });
      setSelectedCell(null);
    }
  }, [getTableDimensions]);

  const clearSelection = useCallback(() => {
    setSelectedCell(null);
    setSelectedRange(null);
  }, []);

  // Style operations
  const applyTableStyle = useCallback((style: Partial<TableStyle>) => {
    const newStyle = { ...tableStyle, ...style };
    setTableStyle(newStyle);
    updateAttributes({ tableStyle: newStyle });
    operationHistory.current.push({ operation: 'applyTableStyle', data: style });
  }, [tableStyle, updateAttributes]);

  const resetTableStyle = useCallback(() => {
    const defaultStyle: TableStyle = {
      borderColor: '#e0e0e0',
      borderWidth: 1,
      backgroundColor: 'transparent',
      headerBg: '#f8f9fa',
      stripedRows: false,
      compact: false,
      alignment: 'left',
    };
    setTableStyle(defaultStyle);
    updateAttributes({ tableStyle: defaultStyle });
  }, [updateAttributes]);

  // Import/Export operations
  const exportToCSV = useCallback((): string => {
    // Extract table data and convert to CSV
    const { rows, cols } = getTableDimensions();
    const csvRows: string[] = [];
    
    // This is a simplified implementation
    // In a real scenario, you'd traverse the actual table content
    for (let i = 0; i < rows; i++) {
      const rowData: string[] = [];
      for (let j = 0; j < cols; j++) {
        rowData.push(`Cell ${i},${j}`); // Placeholder
      }
      csvRows.push(rowData.join(','));
    }
    
    return csvRows.join('\n');
  }, [getTableDimensions]);

  const exportToJSON = useCallback((): object => {
    const { rows, cols } = getTableDimensions();
    return {
      dimensions: { rows, cols },
      style: tableStyle,
      data: [], // Would contain actual table data
    };
  }, [getTableDimensions, tableStyle]);

  const importFromCSV = useCallback((csv: string) => {
    const lines = csv.split('\n');
    const rows = lines.length;
    const cols = lines[0]?.split(',').length || 0;
    
    // This would require rebuilding the table structure
    console.log(`Importing CSV: ${rows}x${cols} table`);
  }, []);

  // Utility functions
  const getCellContent = useCallback((position: TablePosition): string => {
    // Extract content from specific cell
    return `Content at ${position.row},${position.col}`;
  }, []);

  const setCellContent = useCallback((position: TablePosition, content: string) => {
    if (isValidPosition(position)) {
      // Set content of specific cell
      console.log(`Setting cell ${position.row},${position.col} to: ${content}`);
    }
  }, [isValidPosition]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedCell && !selectedRange) return;

      const { key, ctrlKey, metaKey, shiftKey } = event;
      const isCmd = ctrlKey || metaKey;

      // Navigation
      if (selectedCell) {
        let newPosition = { ...selectedCell };
        
        switch (key) {
          case 'ArrowUp':
            newPosition.row = Math.max(0, selectedCell.row - 1);
            break;
          case 'ArrowDown':
            newPosition.row = selectedCell.row + 1;
            break;
          case 'ArrowLeft':
            newPosition.col = Math.max(0, selectedCell.col - 1);
            break;
          case 'ArrowRight':
            newPosition.col = selectedCell.col + 1;
            break;
          case 'Tab':
            event.preventDefault();
            if (shiftKey) {
              newPosition.col = Math.max(0, selectedCell.col - 1);
            } else {
              newPosition.col = selectedCell.col + 1;
            }
            break;
        }

        if (isValidPosition(newPosition)) {
          setSelectedCell(newPosition);
        }
      }

      // Operations
      if (isCmd) {
        switch (key) {
          case 'x':
            if (selectedCell || selectedRange) {
              event.preventDefault();
              // Cut operation
            }
            break;
          case 'c':
            if (selectedCell || selectedRange) {
              event.preventDefault();
              // Copy operation
            }
            break;
          case 'v':
            if (selectedCell) {
              event.preventDefault();
              // Paste operation
            }
            break;
        }
      }

      // Delete
      if (key === 'Delete' || key === 'Backspace') {
        if (selectedCell) {
          setCellContent(selectedCell, '');
        }
      }
    };

    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener('keydown', handleKeyDown);
      return () => tableElement.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedCell, selectedRange, isValidPosition, setCellContent]);

  // Listen for editor selection changes
  useEffect(() => {
    const handleSelectionUpdate = () => {
      const { selection } = editor.state;
      const pos = getPos();
      
      if (selection.from >= pos && selection.to <= pos + node.nodeSize) {
        // Calculate which cell is selected
        // This is simplified - real implementation would need to traverse the node structure
        const relativePos = selection.from - pos;
        // Convert position to row/col coordinates
        setSelectedCell({ row: 0, col: 0 }); // Placeholder
      } else {
        setSelectedCell(null);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, getPos, node.nodeSize]);

  const operations: TableOperations = {
    // Row operations
    addRowBefore,
    addRowAfter,
    deleteRow,
    moveRowUp,
    moveRowDown,
    duplicateRow,
    
    // Column operations
    addColumnBefore,
    addColumnAfter,
    deleteColumn,
    moveColumnLeft,
    moveColumnRight,
    duplicateColumn,
    
    // Cell operations
    mergeCells,
    splitCell,
    setCellAlignment,
    setCellBackground,
    clearCellFormatting,
    
    // Table operations
    deleteTable,
    toggleHeaderRow,
    toggleHeaderColumn,
    resizeTable,
    
    // Selection operations
    selectCell,
    selectRow,
    selectColumn,
    selectTable,
    clearSelection,
    
    // Style operations
    applyTableStyle,
    resetTableStyle,
    
    // Import/Export
    exportToCSV,
    exportToJSON,
    importFromCSV,
    
    // Utility
    getTableDimensions,
    isValidPosition,
    getCellContent,
    setCellContent,
  };

  return {
    // State
    selectedCell,
    selectedRange,
    hovering,
    setHovering,
    tableStyle,
    isResizing,
    setIsResizing,
    tableDimensions,
    tableRef,
    
    // Operations
    ...operations,
    
    // History
    operationHistory: operationHistory.current,
  };
};

export default useTableOperations;