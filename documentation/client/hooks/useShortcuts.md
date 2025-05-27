# `useShortcuts` Hook

The `useShortcuts` hook provides a way to easily define and manage global keyboard shortcuts within your React application. It listens for `keydown` events on the `document` and executes specified callback functions when a registered shortcut combination is pressed.

## Import

```typescript
import useShortcuts, { IShortcut } from "path/to/Twig/src/hooks/useShortcuts";
```
(Adjust the import path based on your project structure.)

## `IShortcut` Type Definition

The core of the `useShortcuts` hook is the `IShortcut` type, which defines the structure for each shortcut:

```typescript
export type IShortcut = {
  run: () => void; // The function to execute when the shortcut is triggered.
  keys: {
    ctrl?: boolean;   // Whether the Control key must be pressed.
    meta?: boolean;   // Whether the Meta key (Command on macOS, Windows key on Windows) must be pressed.
    shift?: boolean;  // Whether the Shift key must be pressed.
    key?: string;     // The specific key to match (e.g., "a", "Enter", "Escape"). Case-insensitive.
    code?: string;    // The specific key code to match (e.g., "KeyA", "Enter", "Escape"). Case-insensitive.
  };
};
```

**Key Properties:**

*   `run`: A function that will be called when the associated key combination is detected.
*   `keys`: An object specifying the key combination.
    *   `ctrl`, `meta`, `shift`: Optional boolean flags.
        *   If a modifier key flag (e.g., `ctrl`) is `undefined`, its state (pressed or not pressed) is ignored for the match.
        *   If a modifier key flag is `true`, the corresponding key *must* be pressed.
        *   If a modifier key flag is `false`, the corresponding key *must not* be pressed.
    *   `key`: Matches against `event.key`. This is generally preferred for printable characters as it respects keyboard layout.
    *   `code`: Matches against `event.code`. This represents the physical key on the keyboard, ignoring layout (e.g., `KeyQ` on a QWERTY keyboard).
    *   **Important**: At least one of `key` or `code` must be provided for a shortcut to be valid. If both are provided, the shortcut will trigger if *either* `key` or `code` matches (along with the modifier keys).

## Hook Props

The `useShortcuts` hook accepts a single prop:

```typescript
type IUseShortcutProps = {
  shortcuts: IShortcut[]; // An array of shortcut configurations.
};
```

*   `shortcuts`: An array of `IShortcut` objects. Each object defines a unique keyboard shortcut and the action to perform.

## Usage Example

Here's how you might use the `useShortcuts` hook in a component:

```tsx
import React from 'react';
import useShortcuts, { IShortcut } from 'path/to/Twig/src/hooks/useShortcuts'; // Adjust path

const MyComponent: React.FC = () => {
  const handleSave = () => {
    console.log('Ctrl+S or Cmd+S pressed: Save action triggered!');
    // Implement save logic here
  };

  const handleOpenHelp = () => {
    console.log('Shift+F1 pressed: Open help triggered!');
    // Implement open help logic here
  };

  const handleLogKey = () => {
    console.log('Key "L" pressed (Ctrl/Meta/Shift do not matter)');
  };

  const shortcuts: IShortcut[] = [
    {
      keys: { meta: true, key: 's' }, // For macOS Cmd+S
      run: handleSave,
    },
    {
      keys: { ctrl: true, key: 's' }, // For Windows/Linux Ctrl+S
      run: handleSave,
    },
    {
      keys: { shift: true, key: 'F1' },
      run: handleOpenHelp,
    },
    {
      keys: { key: 'l' }, // Matches 'l' or 'L'
      run: handleLogKey,
    },
    {
      keys: { ctrl: true, shift: true, code: 'KeyC' }, // Ctrl+Shift+C (physical C key)
      run: () => console.log('Ctrl+Shift+C pressed!'),
    }
  ];

  useShortcuts({ shortcuts });

  return (
    <div>
      <h1>My Component</h1>
      <p>Try pressing Ctrl+S (or Cmd+S), Shift+F1, or just 'L'.</p>
    </div>
  );
};

export default MyComponent;
```

## How It Works

The `useShortcuts` hook utilizes a `useEffect` to add a `keydown` event listener to the `document` when the component mounts (or when the `shortcuts` array changes). When a key is pressed, the `handleKeydown` function iterates through the provided `shortcuts`:

1.  It checks if at least `key` or `code` is defined for the current shortcut configuration.
2.  It then compares the `event.ctrlKey`, `event.metaKey`, and `event.shiftKey` properties with the `ctrl`, `meta`, and `shift` flags defined in the shortcut.
    *   If a modifier is `undefined` in the shortcut definition, it's considered a match regardless of the event's modifier state.
    *   Otherwise, the event's modifier state must exactly match the boolean value specified in the shortcut.
3.  It checks if `event.code` (case-insensitive) matches `shortcut.keys.code` (if provided) OR if `event.key` (case-insensitive) matches `shortcut.keys.key` (if provided).
4.  If all modifier conditions and at least one of the key/code conditions are met, the corresponding `shortcut.run()` function is executed.

The event listener is automatically removed when the component unmounts, preventing memory leaks.

## Dependencies

The `useEffect` hook depends on the `shortcuts` array. This means if you dynamically change the `shortcuts` array passed to the hook, the event listeners will be updated accordingly. Be mindful of providing a stable `shortcuts` array reference if it's not intended to change, to avoid unnecessary re-attachment of event listeners. You can use `useMemo` for the `shortcuts` array if it's generated within the component.