# Displaying Ideas with Idea Cards

The `IdeaCards.tsx` file provides a suite of React components designed to display idea information in various formats. These cards are flexible and can be customized to show different levels of detail, handle user interactions, and integrate with drag-and-drop functionalities.

There are three main types of idea cards:

- `CompactIdeaCard`: For displaying ideas in a very condensed format, suitable for lists or tight spaces.
- `StandardIdeaCard`: A balanced representation, showing key information like title, description, and tags.
- `DetailedIdeaCard`: For a more comprehensive view of an idea, often used when an idea is selected or in focus.

All idea cards are built using Mantine components and rely on shared types for consistency.

## Core Concepts

### `IIdea` Object

All idea cards require an `idea` prop, which is an object of type `IIdea`. This type is typically imported from the backend models (e.g., `../../../../app/database/models/ideas`) and contains all the core information about an idea, such as its `id`, `title`, `description`, etc.

### Shared Props (`IdeaCardSharedProps`)

All three card components extend `IdeaCardSharedProps`, meaning they all accept the following common properties:

| Prop                      | Type                                                | Description                                                                                             |
| :------------------------ | :-------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| `idea`                    | `IIdea`                                             | **Required.** The core idea object.                                                                     |
| `artifacts`               | `IdeaArtifact[]`                                    | Optional. Array of artifacts associated with the idea.                                                  |
| `tags`                    | `IdeaTag[]`                                         | Optional. Array of tags associated with the idea.                                                       |
| `actions`                 | `IdeaAction[]`                                      | Optional. Array of actions (e.g., edit, delete) that can be performed on the idea.                      |
| `onCardClick`             | `(event: React.MouseEvent, idea: IIdea) => void`    | Optional. Callback function when the card is clicked.                                                   |
| `draggable`               | `boolean`                                           | Optional. If `true`, makes the card draggable.                                                          |
| `onDragStartCard`         | `(event: React.DragEvent, idea: IIdea) => void`     | Optional. Callback function when dragging of the card starts.                                           |
| `onDragEndCard`           | `(event: React.DragEvent, idea: IIdea) => void`     | Optional. Callback function when dragging of the card ends.                                             |
| `showDefaultDragHandle`   | `boolean`                                           | Optional. If `true` and `draggable` is `true`, shows a default drag handle icon.                        |
| `isExternallyHighlighted` | `boolean`                                           | Optional. If `true`, applies a highlighted style to the card (e.g., during drag-over).                  |
| `onMouseEnterCard`        | `(event: React.MouseEvent, ideaId: string) => void` | Optional. Callback function when the mouse pointer enters the card.                                     |
| `onMouseLeaveCard`        | `(event: React.MouseEvent, ideaId: string) => void` | Optional. Callback function when the mouse pointer leaves the card.                                     |
| `className`               | `string`                                            | Optional. Custom CSS class name to apply to the card.                                                   |
| `cardPadding`             | `MantineSpacing`                                    | Optional. Mantine spacing value for card padding (e.g., "sm", "md", "lg"). Default varies by card type. |
| `cardRadius`              | `MantineRadius`                                     | Optional. Mantine radius value for card corners. Defaults to "md".                                      |
| `cardShadow`              | `MantineShadow`                                     | Optional. Mantine shadow value for the card. Defaults to "sm".                                          |
| `style`                   | `React.CSSProperties`                               | Optional. Custom inline CSS styles for the card.                                                        |

Refer to `Twig/src/components/Display/Ideas/IdeaCardTypes.d.ts` for definitions of `IdeaArtifact`, `IdeaTag`, and `IdeaAction`.

## `CompactIdeaCard`

The `CompactIdeaCard` is designed for scenarios where space is limited and you need to display many ideas, such as in a list or a dense grid. It typically shows the title and a minimal set of information, with more details available on hover.

### Specific Props

In addition to `IdeaCardSharedProps`, `CompactIdeaCard` accepts:

| Prop                  | Type                                              | Default | Description                                                                                            |
| :-------------------- | :------------------------------------------------ | :------ | :----------------------------------------------------------------------------------------------------- |
| `detailsForHoverCard` | `React.ReactNode`                                 | -       | Content to display inside the hover card. If not provided, `getIdeaDefaultSummary(idea)` is used.      |
| `hoverCardProps`      | `Partial<React.ComponentProps<typeof HoverCard>>` | `{}`    | Props to customize the underlying Mantine `HoverCard` component (e.g., `width`, `shadow`, `position`). |
| `showTitleOnly`       | `boolean`                                         | `false` | If `true`, the card will only display the title and the actions menu, making it extremely compact.     |
| `maxTitleLines`       | `number`                                          | `2`     | Maximum number of lines for the idea title before truncating.                                          |

### Usage Example

```tsx
import { CompactIdeaCard } from "./IdeaCards";
import { IIdea, IdeaTag, IdeaAction, IdeaArtifact } from "./IdeaCardTypes"; // Adjust path as needed

const myIdea: IIdea = {
  id: "1",
  title: "My Compact Idea" /* ...other IIdea properties */,
};
const myTags: IdeaTag[] = [{ id: "tag1", label: "Urgent" }];
const myActions: IdeaAction[] = [
  {
    id: "edit",
    label: "Edit",
    onClick: (e, idea) => console.log("Edit", idea.id),
  },
];

<CompactIdeaCard
  idea={myIdea}
  tags={myTags}
  actions={myActions}
  detailsForHoverCard="This is a brief summary that appears on hover."
  onCardClick={(e, idea) => console.log("Clicked on", idea.title)}
  draggable
  showDefaultDragHandle
/>;
```

## `StandardIdeaCard`

The `StandardIdeaCard` offers a more balanced view, suitable for general display where you want to show the title, a short description, tags, and actions without overwhelming the user.

### Specific Props

In addition to `IdeaCardSharedProps`, `StandardIdeaCard` accepts:

| Prop                  | Type                                              | Default | Description                                                                                                |
| :-------------------- | :------------------------------------------------ | :------ | :--------------------------------------------------------------------------------------------------------- |
| `description`         | `React.ReactNode`                                 | -       | Inline description content for the card. If not provided, `getIdeaDefaultSummary(idea)` is used.           |
| `detailsForHoverCard` | `React.ReactNode`                                 | -       | Optional. Content for the hover card if you want to show more details than the inline `description`.       |
| `hoverCardProps`      | `Partial<React.ComponentProps<typeof HoverCard>>` | `{}`    | Props to customize the underlying Mantine `HoverCard` component.                                           |
| `visibleActionsCount` | `number`                                          | `2`     | Number of primary actions to display directly on the card. Additional actions will be in an overflow menu. |
| `maxDescriptionLines` | `number`                                          | `3`     | Maximum number of lines for the inline description before truncating.                                      |

### Usage Example

```tsx
import { StandardIdeaCard } from "./IdeaCards";
import { IIdea, IdeaTag, IdeaAction, IdeaArtifact } from "./IdeaCardTypes"; // Adjust path as needed

const myIdea: IIdea = {
  id: "2",
  title: "My Standard Idea",
  description: "A concise description of the standard idea.",
  // ...other IIdea properties
};
const myArtifacts: IdeaArtifact[] = [
  { id: "art1", content: "Document.pdf", icon: <FilePdf size={16} /> },
];
const myActions: IdeaAction[] = [
  {
    id: "view",
    label: "View",
    onClick: (e, idea) => console.log("View", idea.id),
  },
  {
    id: "share",
    label: "Share",
    onClick: (e, idea) => console.log("Share", idea.id),
  },
];

<StandardIdeaCard
  idea={myIdea}
  artifacts={myArtifacts}
  actions={myActions}
  description="This idea is about improving user workflow."
  visibleActionsCount={1}
  draggable
/>;
```

## `DetailedIdeaCard`

The `DetailedIdeaCard` is used when you need to display comprehensive information about an idea. It allows for a longer description and an additional section for structured details.

### Specific Props

In addition to `IdeaCardSharedProps`, `DetailedIdeaCard` accepts:

| Prop                    | Type              | Default | Description                                                                                                                 |
| :---------------------- | :---------------- | :------ | :-------------------------------------------------------------------------------------------------------------------------- |
| `description`           | `React.ReactNode` | -       | Primary inline content for the card, can be longer and support multi-line text. Defaults to `getIdeaDefaultSummary(idea)`.  |
| `detailsSectionContent` | `React.ReactNode` | -       | Optional. Additional structured content to be displayed in a separate section of the card (e.g., custom components, lists). |
| `visibleActionsCount`   | `number`          | `3`     | Number of primary actions to display directly. More actions will be in an overflow menu.                                    |

### Usage Example

```tsx
import { DetailedIdeaCard } from "./IdeaCards";
import { IIdea, IdeaTag, IdeaAction } from "./IdeaCardTypes"; // Adjust path as needed
import { Text, List } from "@mantine/core"; // Example for detailsSectionContent

const myIdea: IIdea = {
  id: "3",
  title: "My Detailed Idea Exploration",
  // ...other IIdea properties
};
const myTags: IdeaTag[] = [
  { id: "tag1", label: "Research" },
  { id: "tag2", label: "Feature" },
];
const myActions: IdeaAction[] = [
  {
    id: "discuss",
    label: "Discuss",
    onClick: (e, idea) => console.log("Discuss", idea.id),
  },
  {
    id: "archive",
    label: "Archive",
    onClick: (e, idea) => console.log("Archive", idea.id),
  },
];

const customDetails = (
  <>
    <Text size="sm" fw={500}>
      Key Points:
    </Text>
    <List size="sm">
      <List.Item>Point one about the idea.</List.Item>
      <List.Item>Another important detail.</List.Item>
    </List>
  </>
);

<DetailedIdeaCard
  idea={myIdea}
  tags={myTags}
  actions={myActions}
  description="This section contains a full, potentially multi-paragraph description of the idea, outlining its goals, benefits, and potential challenges. It supports pre-wrapped text."
  detailsSectionContent={customDetails}
/>;
```

## Supporting Types

The idea cards make use of several supporting types defined in `IdeaCardTypes.d.ts`:

- **`IdeaAction`**: Defines an action button or menu item.

  - `id: string`
  - `label: string`
  - `icon?: React.ReactElement<IconProps>` (Phosphor icon instance)
  - `onClick: (event: React.MouseEvent, idea: IIdea) => void`
  - `color?: MantineColor`
  - `variant?: MantineButtonVariant`
  - `disabled?: boolean`
  - `tooltip?: string`
  - `isOverflow?: boolean` (If true, suggests placement in an overflow menu)

- **`IdeaTag`**: Defines a tag.

  - `id: string`
  - `label: string`
  - `icon?: React.ReactElement<IconProps>` (Phosphor icon instance)
  - `color?: MantineColor`
  - `variant?: "filled" | "light" | "outline" | "dot"`

- **`IdeaArtifact`**: Defines an artifact linked to an idea.
  - `id: string`
  - `content: React.ReactNode` (The content to display for the artifact)
  - `tooltip?: string`
  - `icon?: React.ReactElement<IconProps>` (Phosphor icon instance)

These types are used to structure the data passed to the `artifacts`, `tags`, and `actions` props of the cards.

## Helper Function: `getIdeaDefaultSummary`

The `IdeaCards.tsx` file also includes a helper function:
`const getIdeaDefaultSummary = (idea: IIdea): string | undefined => { ... }`

This function attempts to generate a default summary string for an idea, typically from its description or other relevant fields. It's used internally by the cards if a more specific description or hover detail is not provided. You generally won't need to call this directly when using the cards, but it's good to be aware of its role in providing default content.
