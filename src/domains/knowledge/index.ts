// Knowledge Domain Public API
// Exports components, hooks, and utilities for interacting with core Knowledge entities (Ideas, Tasks, Sources, Excerpts).

// Components
export { default as IdeaCard } from "./components/Ideas/Interactions/IdeaCard";
export { default as IdeaButton } from "./components/Ideas/Interactions/IdeaButton";
export { default as TaskCard } from "./components/Tasks/TaskCard";
export { default as TaskButton } from "./components/Tasks/TaskButton";
export { default as SourceCard } from "./components/Sources/SourceCard";
export { default as SourceButton } from "./components/Sources/SourceButton";
export { default as ExcerptButton } from "./components/Excerpts/ExcerptButton";
export { default as CreateTask } from "./components/Forms/CreateTask";
export { default as AddSource } from "./components/Forms/AddSource";

// Hooks
export { default as useConnectable } from "./hooks/useConnectable";
export { useConnection } from "./hooks/useConnection";
export { default as usePins } from "./hooks/usePins";
export { default as useTag } from "./hooks/useTag";

// Utils (Functional Logic)
export * from "./utils/ideas";
export * from "./utils/tasks";
export * from "./utils/sources";
export * from "./utils/excerpts";
export * from "./utils/tags";
export * from "./utils/pins";
export * from "./utils/shares";

// Re-exporting Core Types for Domain Consumers
export type { IIdea, ISafeIdea, IIdeaForm } from "../../../shared/types/idea";
export type { ITask, ITaskForm } from "../../../app/database/models/task";
export type { ISource, ISourceForm } from "../../../app/database/models/source";
export type { IExcerpt, IExcerptForm } from "../../../shared/types/excerpt";
