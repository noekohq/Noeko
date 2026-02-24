// Identity Domain Public API
// Exports only the components, hooks, and contexts that are intended for external domain use.

// Contexts & Providers
export { AuthProvider, useAuth } from "./contexts/AuthContext";

// Components
export { default as UserCard } from "./components/Users/UserCard";

// Utils
export { userIsSuperuser } from "./utils/user";
export type { ISafeUser } from "../../../shared/types/user";
