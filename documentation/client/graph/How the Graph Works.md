# Graph Component Implementation Guide

This document provides a detailed explanation of the current architecture for the graph visualization component. It has been refactored to support a large number of nodes and edges efficiently by offloading heavy computation to a Web Worker.

---

## 1. High-Level Architecture

The graph system is split into two primary, independent parts that communicate via messages:

1.  **The Simulation (Web Worker):** A separate thread responsible for all physics calculations. It runs a `d3-force` simulation to determine the position of each node over time. It knows nothing about rendering or the DOM.
2.  **The Renderer (React Component):** The `GraphContainer.tsx` component is responsible for rendering the nodes and edges as SVG elements. It also handles all user interactions like panning, zooming, and dragging. It is the "view" layer and does not perform any physics calculations itself.

This separation ensures that the main UI thread remains responsive and smooth, even when the physics simulation is under heavy load.

---

## 2. The Web Worker (`src/workers/graph.worker.ts`)

The worker is the computational heart of the graph.

### Key Responsibilities

-   Receiving node and edge data from the main thread.
-   Initializing and running a `d3-force` simulation.
-   Continuously calculating node positions.
-   Responding to commands from the main thread (e.g., "a node is being dragged").
-   Sending updated node coordinates back to the main thread on every "tick" of the simulation.

### Communication

The worker listens for messages from the `GraphContainer` and acts based on a `type` field in the message data.

-   `self.onmessage = (event) => { ... }` is the entry point for all incoming communication.

**Incoming Message Types:**

-   `update_data`: Receives the initial set of nodes and edges. It stops any existing simulation and creates a new one with the new data.
-   `update_node_position`: Called continuously when a user is dragging a node. It receives a node ID and its new `(fx, fy)` coordinates, fixing it in place and "reheating" the simulation so other nodes react.
-   `end_node_drag`: Called when the user releases a node. It "un-fixes" the node by setting its `fx` and `fy` to `null`, allowing it to move freely again.

**Outgoing Message Types:**

-   `tick`: The worker sends this message back to the `GraphContainer` on every step of the `d3-force` simulation. The payload contains an array of all nodes with their new `id`, `x`, and `y` coordinates.
-   `end`: Sent when the simulation has cooled down and come to a resting state.

---

## 3. The React Component (`src/components/Graph/Graph.tsx`)

This component is the view layer and the user interaction controller.

### Key Responsibilities

-   Managing the lifecycle of the Web Worker.
-   Rendering the SVG canvas, nodes, and edges based on state.
-   Handling user input for panning, zooming, and dragging.
-   Translating user actions into messages for the worker.
-   Updating its internal state in response to messages from the worker.

### Worker Management

-   A `useEffect` hook is responsible for creating and destroying the worker.
-   When the component mounts, it creates a new `Worker` instance:
    ```typescript
    const worker = new Worker(
      new URL("../../workers/graph.worker.ts", import.meta.url),
      { type: "module" }
    );
    ```
    -   The `new URL(...)` syntax is essential for modern bundlers (like Vite/Next.js) to correctly package the worker file.
    -   `{ type: "module" }` is critical because our worker script uses ES6 `import` statements.
-   The hook's cleanup function calls `worker.terminate()` to ensure the worker is destroyed when the component unmounts, preventing memory leaks.

### Data Flow and State Management

1.  **Initialization:**
    -   On mount, `GraphContainer` sends an `update_data` message to the worker with the graph data.
    -   The component maintains a `nodes` array in its React state: `const [nodes, setNodes] = useState<INode[]>([]);`. This state is the single source of truth for rendering.

2.  **Receiving Updates:**
    -   The `worker.onmessage` handler listens for `tick` messages from the worker.
    -   When a `tick` message arrives, it calls `setNodes(...)` with the new node positions. This triggers a re-render, and all the `Node` and `Edge` child components receive the new coordinates as props and move to their new positions.

3.  **Handling User Input (Dragging):**
    -   When a user starts dragging a node, the `startNodeDrag` function is called.
    -   It sends an `update_node_position` message to the worker with the node's ID and its current position.
    -   As the user moves the mouse/finger, the `handleMouseMove` function continuously sends more `update_node_position` messages to the worker with the new coordinates.
    -   When the user releases the node, `handleMouseUp` sends a final `end_node_drag` message.

---

## 4. Rendering Components (`Node.tsx`, `Edge.tsx`)

These are simple, presentational components.

-   They receive all necessary data as props (e.g., `node`, `sourceNode`, `targetNode`).
-   Their primary job is to render SVG elements (`<g>`, `<circle>`, `<line>`, etc.).
-   The position of a node is determined by the `transform` attribute on its root `<g>` element, which is updated on every render: `transform={translate(${node.x ?? 0}, ${node.y ?? 0})}`.
-   They are wrapped in `React.memo` to prevent unnecessary re-renders if their props have not changed.

---

## 5. How to Modify

-   **To change the physics (e.g., make nodes repel more):** Modify the `.force(...)` calls inside the `initializeSimulation` function in `src/workers/graph.worker.ts`.
-   **To add a new interaction:**
    1.  Add the event handler (e.g., `onDoubleClick`) to the `Node` component in `src/components/Graph/Node.tsx`.
    2.  Implement the logic for that handler inside `src/components/Graph/Graph.tsx`.
    3.  If the interaction needs to affect the simulation, define a new message type and send it to the worker.
    4.  Add a `case` for the new message type in the worker's `onmessage` handler to modify the simulation accordingly.