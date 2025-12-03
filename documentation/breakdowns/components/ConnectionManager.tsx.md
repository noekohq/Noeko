# `ConnectionManager` Component

## Overview

The `ConnectionManager` is a React component responsible for displaying and managing relationships for a given data item, referred to as a `connectable`. It provides a user interface to visualize, create, and remove connections to other items.

The component distinguishes between two fundamental types of relationships:

1.  **CONNECTED:** Explicit, user-defined links. These are created manually by the user and are persistent.
2.  **RELATED:** Implicit, algorithmically-suggested links. The system automatically finds and displays items that are semantically similar to the current item's content.

## How It Works

The component's primary logic for data fetching and state management is abstracted into the `useConnectable` custom hook. This hook supplies the `ConnectionManager` with the lists of `connected` and `similar` items, loading state booleans, and the functions (`connect`, `disconnect`, `load`) needed to interact with the backend.

The UI is built using the Mantine component library. Each related or connected item is rendered within a `CollapseButton`, which shows a `ConnectableThing` component as a summary. Expanding the `CollapseButton` reveals more details and contextual action buttons like "Connect" or "Disconnect".

## User Interaction

Users can interact with the `ConnectionManager` in the following ways:

-   **View Relationships:** Quickly see all manually connected and automatically related items.
-   **Create Connections:**
    -   **Drag and Drop:** Drag another connectable item from elsewhere in the application and drop it onto the "CONNECTED" area to create a manual link.
    -   **From Suggestions:** Click the **Connect** button on an item in the "RELATED" list to make that implicit relationship explicit.
    -   **Create and Connect New:** Click the pencil icon (`NotePencilIcon`) to open a dialog for creating a new note that will be automatically and explicitly linked.
-   **Remove Connections:** Expand a "CONNECTED" item and click the **Disconnect** button.
-   **Refresh Data:** The list of related items can be refreshed using the clockwise arrow icon. The entire component can be refreshed by its parent via the `shouldUpdate` prop.

## Props

| Prop           | Type                      | Description                                                                 |
| -------------- | ------------------------- | --------------------------------------------------------------------------- |
| `connectable`  | `IConnectable`            | **Required.** The central item for which to manage connections.              |
| `onReload`     | `() => void`              | *Optional.* A callback function to be executed when a reload action occurs. |
| `shouldUpdate` | `boolean`                 | *Optional.* When this prop changes to `true`, it triggers a data refresh.   |

## Key Considerations & Dependencies

-   **Presentation vs. Logic:** This component is primarily for presentation. The core business logic resides in the `useConnectable` hook and the backend services it communicates with.
-   **Drag-and-Drop Contract:** The drag-and-drop functionality requires the dragged item to provide a specific `application/json` payload containing an identifier like `thingId`, `ideaId`, or `taskId`.
-   **Rabbithole Context:** The `useRabbithole` hook can influence the "RELATED" items. When a user is in a "rabbithole" (a focused exploration mode), the similarity search may be scoped, altering the suggestions.
-   **Dependencies:** The component heavily relies on:
    -   `useConnectable` hook for data and actions.
    -   `InteractionContext` for creating new connected items.
    -   Mantine UI library (`@mantine/core`) for all UI elements.
    -   Phosphor Icons (`@phosphor-icons/react`) for icons.
