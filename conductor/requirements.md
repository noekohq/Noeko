# Project Requirements

## Initial Concept
Noeko is an app for knowledge base management with a focus on semantic connections. The goal of this project is to remove friction from knowledge management, and bring clarity to scattered thoughts. So, it's an intelligent knowledge base that self-organizes and gets smarter as you use it. 

## Target Audience
Our users are primarily integrators, people with lots of ideas looking to integrate them across multiple domains into insights. We cater to both individual users and enterprise teams.

- **Individual Users:** We value freedom and autonomy, allowing self-hostability if they choose, but also providing a cloud offering.
- **Enterprise Teams:** For enterprise features like collaboration, etc, we will be charging, but self-hostability is still possible with a license.

## Core Features
The most important core feature is **contextual resurfacing**: making sure that if something gets put into Noeko, it will show back up when it's most useful.

Other critical features include:
- **Semantic Search & Retrieval:** While we already have semantic search, ensuring search and retrieval are top-notch is a key priority.
- **Constellation (Graph) View:** We have a graph view that needs improvement to help users explore connections.
- **Real-time Collaboration:** A key differentiator, allowing users to connect their own ideas to shared ideas, building interface nodes shared between multiple people while still contributing to their individual knowledge-graph.

## User Experience & Design Principles
The user experience should be a combination of simplicity and playful exploration. The interface should feel intuitive and "melt away," so the user can focus on their ideas.

Our guiding principles are:
- **Simplicity over Minimalism:** We are not afraid of functionality, but it must be executed in a way that never introduces extraneous cognitive load or friction.
- **Clarity:** The interface must contribute to clarity, not confusion.
- **Adventurous & Exploratory:** We encourage users to explore their knowledge in a non-linear way, but the interface should not get in their way.
- **Efficiency:** The most useful action should never be more than a click or keystroke away, and the most useful information should never be more than a glance away.

---

## Brand Tone and Voice
Our brand's tone and voice should be context-aware, balancing professionalism with a friendly, exploratory feel. 

- **Professional and Authoritative:** In contexts where reliability and trust are paramount, such as when displaying definitive data or in security-related communication, the tone should be serious and authoritative.
- **Friendly and Approachable:** In contexts of exploration, brainstorming, and discovery, the tone should be welcoming, and encouraging. The user should feel safe and enjoy the experience of thinking and knowledge capture.

The goal is to be a trusted partner in the user's knowledge journey.

## Visual Identity
The visual style is a combination of "Clean and Modern" and "Organic and Hand-crafted". We aim for a "paper-bubble-tactile-like" approach.

- **Color Palette:** We use soft, organic tones, like the Gruvbox palette, to make it enjoyable to spend long amounts of time in the editor.
- **Signal-to-Noise Ratio:** We prioritize a high signal-to-noise ratio, keeping the interface clean and uncluttered.
- **Tactile Feel:** The UI should feel snappy and responsive, but also soft and organic, with some depth, but not heading too far in the direction of skeumorphism.
- **Responsiveness:** The UI should be snappy and responsive.

### Implementation Examples
The following files are good examples of our visual style:
- `@src/components/Display/Paper/PaperButton.module.scss`
- `@src/components/Display/Paper/Tags/PaperTag.module.scss`
- `@src/components/Display/Paper/Things/PaperThing.module.scss`

---

## Technology Stack

### Overview
This project utilizes a modern and robust technology stack designed for a performant and scalable knowledge base management system with collaborative features.

### Core Technologies

#### Programming Language
-   **TypeScript**: The primary programming language used across both frontend and backend for enhanced code quality, maintainability, and developer experience.

#### Frontend
-   **React**: A declarative, component-based JavaScript library for building user interfaces, enabling efficient and interactive UIs.
-   **Mantine**: A comprehensive React components library and design system, providing ready-to-use, customizable UI components.
-   **Vite**: A next-generation frontend tooling that provides an extremely fast development experience with features like instant hot module replacement (HMR).

#### Backend
-   **Express**: A fast, unopinionated, minimalist web framework for Node.js, used for building the application's APIs and handling server-side logic.
-   **Hocuspocus**: A WebSocket-based backend for real-time collaboration, seamlessly integrating with rich-text editors and other collaborative features.

#### Database
-   **SurrealDB**: A new-generation cloud-native database, offering multi-model capabilities and real-time functionalities suitable for complex data relationships in a knowledge base.

### Development Tools
-   **Bun**: An all-in-one JavaScript runtime, bundler, transpiler, and package manager, used for faster development and build processes.
-   **Docker / Docker Compose**: Used for containerization of the database and potentially other services, ensuring consistent development and deployment environments.
