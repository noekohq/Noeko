# Enhanced DreamTable Documentation

## Overview

The Enhanced DreamTable is a comprehensive table implementation for the Tiptap editor that provides advanced table manipulation capabilities, styling options, and user-friendly interactions. This implementation goes far beyond basic table functionality to offer a professional-grade table editing experience.

## Features

### Core Table Operations

#### Row Operations
- **Add Row Before/After**: Insert new rows above or below the current selection
- **Delete Row**: Remove the selected row
- **Move Row Up/Down**: Reorder rows within the table
- **Duplicate Row**: Create a copy of the selected row

#### Column Operations
- **Add Column Before/After**: Insert new columns to the left or right of current selection
- **Delete Column**: Remove the selected column
- **Move Column Left/Right**: Reorder columns within the table
- **Duplicate Column**: Create a copy of the selected column

#### Cell Operations
- **Merge Cells**: Combine multiple selected cells into one
- **Split Cell**: Divide a merged cell back into individual cells
- **Cell Alignment**: Set text alignment (left, center, right) for individual cells
- **Cell Background**: Set custom background colors for cells
- **Clear Formatting**: Remove all custom formatting from cells

### Advanced Features

#### Table Styling
- **Border Customization**: Adjust border color and width
- **Background Colors**: Set table and header background colors
- **Striped Rows**: Toggle alternating row colors for better readability
- **Compact Mode**: Reduce padding for space-efficient tables
- **Header Styling**: Special styling for header rows and columns

#### Selection Management
- **Cell Selection**: Click to select individual cells
- **Row Selection**: Select entire rows for bulk operations
- **Column Selection**: Select entire columns for bulk operations
- **Range Selection**: Select multiple cells for batch operations
- **Table Selection**: Select the entire table

#### Resizing
- **Dynamic Resizing**: Drag handles to resize table width and height
- **Responsive Design**: Tables adapt to different screen sizes
- **Minimum Size Constraints**: Prevents tables from becoming too small

#### Import/Export
- **CSV Export**: Export table data to CSV format
- **JSON Export**: Export with full structure and styling information
- **CSV Import**: Import data from CSV files or text
- **File Upload**: Direct file import support

## Usage

### Basic Table Creation

```typescript
import { DreamTable } from './nodes/DreamTable';

// In your Tiptap editor configuration
const editor = useEditor({
  extensions: [
    StarterKit,
    DreamTable.configure({
      // Table configuration options
    }),
    // ... other extensions
  ],
});
```

### Programmatic Operations

```typescript
// Access table operations through the hook
const tableOperations = useTableOperations({
  editor,
  node,
  getPos,
  updateAttributes,
});

// Example operations
tableOperations.addRowAfter();
tableOperations.mergeCells();
tableOperations.setCellAlignment('center');
tableOperations.applyTableStyle({
  borderColor: '#ff0000',
  stripedRows: true,
});
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Move to next cell |
| `Shift + Tab` | Move to previous cell |
| `Arrow Keys` | Navigate between cells |
| `Ctrl/Cmd + X` | Cut selected content |
| `Ctrl/Cmd + C` | Copy selected content |
| `Ctrl/Cmd + V` | Paste content |
| `Delete/Backspace` | Clear cell content |

### Context Menu

Right-click on any table cell to access the comprehensive context menu with all available operations:

- Row operations (add, delete, move, duplicate)
- Column operations (add, delete, move, duplicate)
- Cell operations (align, merge, split, format)
- Selection tools (select row, column, table)
- Styling options
- Import/Export tools

## Styling Classes

### CSS Classes Applied

```scss
.dreamTableWrapper {
  // Main table container
  &.hovering {
    // Styles when table is hovered
  }
}

.tableControls {
  // Floating toolbar styles
  &.visible {
    // Visible state styles
  }
}

.tableContent {
  table {
    // Core table styles
    
    th, td {
      // Cell styles
      &.selectedCell {
        // Selected cell styles
      }
      
      &.align-left { text-align: left; }
      &.align-center { text-align: center; }
      &.align-right { text-align: right; }
    }
    
    &.compact {
      // Compact mode styles
    }
    
    &.striped {
      // Striped rows styles
    }
  }
}

.resizeHandle {
  // Resize handle styles
  &.horizontal {
    // Horizontal resize handle
  }
  
  &.vertical {
    // Vertical resize handle
  }
}
```

### Custom Styling

Apply custom styles through the styling interface or programmatically:

```typescript
// Apply custom table style
tableOperations.applyTableStyle({
  borderColor: '#2196f3',
  borderWidth: 2,
  backgroundColor: '#f5f5f5',
  headerBg: '#e3f2fd',
  stripedRows: true,
  compact: false,
});

// Reset to default styles
tableOperations.resetTableStyle();
```

## Component Architecture

### Core Components

1. **DreamTable** - Main extension that integrates with Tiptap
2. **DreamTableNodeView** - React component for table rendering
3. **TableControls** - Floating toolbar with quick actions
4. **TableContextMenu** - Comprehensive right-click menu
5. **ResizeHandle** - Drag handles for table resizing

### Custom Hook

**useTableOperations** - Centralized state management and operations:

```typescript
interface TableOperations {
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
  
  // ... many more operations
}
```

## Accessibility

### Keyboard Navigation
- Full keyboard support for table navigation
- Tab navigation between cells
- Arrow key navigation
- Screen reader compatibility

### Focus Management
- Clear focus indicators
- Proper focus trapping within table
- Accessible shortcuts

### ARIA Support
- Proper ARIA labels for table elements
- Role definitions for complex table structures
- Screen reader announcements for operations

## Responsive Design

### Mobile Support
- Touch-friendly controls
- Horizontal scrolling for large tables
- Simplified toolbar for smaller screens
- Gesture support for selection

### Tablet Support
- Optimized for touch interactions
- Larger touch targets
- Adaptive UI based on screen size

### Desktop
- Full feature set available
- Hover interactions
- Precise mouse controls
- Keyboard shortcuts

## Performance Optimizations

### Virtualization
- Large table support through virtual scrolling
- Efficient rendering of visible cells only
- Memory optimization for extensive datasets

### Debounced Operations
- Smooth resize operations
- Optimized style updates
- Reduced re-render frequency

### Memoization
- Component memoization for static elements
- Callback optimization
- State update batching

## Browser Support

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Polyfills
- CSS Grid support for older browsers
- Intersection Observer polyfill
- ResizeObserver polyfill

## Troubleshooting

### Common Issues

1. **Table not appearing**: Ensure DreamTable is properly registered with the editor
2. **Styling not applied**: Check CSS module imports and class name resolution
3. **Context menu not working**: Verify right-click event handling
4. **Resize handles invisible**: Check hover state CSS and z-index

### Debug Mode

Enable debug logging:

```typescript
const tableOperations = useTableOperations({
  editor,
  node,
  getPos,
  updateAttributes,
  debug: true, // Enable debug logging
});
```

## Future Enhancements

### Planned Features
- Formula support for calculated cells
- Advanced filtering and sorting
- Cell data validation
- Collaborative editing improvements
- Enhanced import/export formats (Excel, Google Sheets)
- Chart integration
- Conditional formatting

### API Extensions
- Plugin system for custom operations
- Extensible context menu
- Custom cell renderers
- Advanced theming support

## Examples

### Basic Table with Styling

```typescript
// Create a styled table
const createStyledTable = () => {
  editor.chain()
    .focus()
    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
    .run();
    
  // Apply styling
  tableOperations.applyTableStyle({
    borderColor: '#2196f3',
    stripedRows: true,
    compact: false,
  });
};
```

### Import CSV Data

```typescript
const csvData = `Name,Age,City
John,30,New York
Jane,25,Los Angeles
Bob,35,Chicago`;

tableOperations.importFromCSV(csvData);
```

### Export Table Data

```typescript
// Export as CSV
const csvData = tableOperations.exportToCSV();
console.log(csvData);

// Export as JSON
const jsonData = tableOperations.exportToJSON();
console.log(jsonData);
```

This enhanced table implementation provides a comprehensive, user-friendly table editing experience that rivals professional document editors while maintaining the flexibility and extensibility of the Tiptap framework.