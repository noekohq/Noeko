# Model Files Documentation

Model files in this project serve as an abstraction layer over the database, providing a structured way to interact with data. They define the shape of the data, encapsulate database logic, and offer methods for common CRUD (Create, Read, Update, Delete) operations, as well as more complex business logic.

## Core Concepts

### 1. Location
Model files are primarily located in the `Twig/app/database/models/` directory. Some complex models, like `Idea`, might have their own subdirectories (e.g., `Twig/app/database/models/ideas/`).

### 2. File Naming
- Model files are typically named after the entity they represent (e.g., `user.ts`, `project.ts`, `feedback.ts`).
- The main model for ideas is found in `Twig/app/database/models/ideas/index.ts`.

### 3. Structure of a Model File

Most model files follow a common structure:

*   **Imports**:
    *   `RecordId`, `StringRecordId` from `"surrealdb"`: For handling SurrealDB record identifiers.
    *   `getDatabase` from `"../db"`: A utility function to get a database instance.
    *   Other models if there are relationships (e.g., `User` model in `Feedback` model).
    *   Utility functions or external libraries as needed.

*   **Type Definitions (Interfaces)**:
    *   **Main Interface (`I<ModelName>`)**: Defines the structure of the model's record in the database, including its `id` (usually `RecordId | string`), timestamps (`createdAt`, `updatedAt`), and other fields.
        ```Twig/app/database/models/feedback.ts#L4-L13
        export type IFeedback = {
          id: RecordId | string;
          content: string;
          consentToContact: boolean;
          status: "unaddressed" | "in-progress" | "addressed";
          user?: IUser;
          createdAt: Date;
          updatedAt: Date;
        };
        ```
    *   **Form Interface (`I<ModelName>Form`)**: Often an `Omit` type based on the main interface, excluding fields like `id`, `createdAt`, and `updatedAt` that are typically auto-generated or set by the system during creation.
        ```Twig/app/database/models/feedback.ts#L15-L19
        export type IFeedbackForm = Omit<
          IFeedback,
          "id" | "createdAt" | "updatedAt" | "user"
        >;
        ```
    *   **Relationship/Ownership Interfaces**: Define the structure of records that represent relationships between models (e.g., `IProjectUserOwnership`, `ITagIdeaRelationship`). These typically include `id`, `in` (source record ID), and `out` (target record ID).
        ```Twig/app/database/models/project.ts#L15-L20
        export type IProjectUserOwnership = {
          id: string | RecordId;
          in: string | RecordId; // User ID
          out: string | RecordId; // Project ID
          createdAt: Date;
        };
        ```

*   **Class Definition (`<ModelName>`)**:
    *   Contains static methods for interacting with the database for this entity.
    *   Some models might have a constructor for instance-based operations, though static methods are more common for direct DB interactions.
        ```Twig/app/database/models/feedback.ts#L21-L22
        export class Feedback {
          constructor() {}
        // ... static methods
        }
        ```

### 4. Common Static Methods

*   **`up()`**:
    *   Used to define and register database-specific functions or schema elements (e.g., SurrealQL `DEFINE FUNCTION`). This method is typically called during application initialization.
    *   Example from `Project` model:
        ```Twig/app/database/models/project.ts#L30-L46
        static async up() {
            const db = await getDatabase();
            if (!db) {
              throw new Error("Something went wrong getting the database");
            }

            const getUserProjectsFunction = () => {
              return `
              DEFINE FUNCTION OVERWRITE fn::get_user_projects(
                $userId: record<user>,
              ) {
                RETURN SELECT VALUE ->owns->project FROM ONLY $userId FETCH project;
              }`;
            };

            // ... more function definitions ...

            await db.query(getUserProjectsFunction());
            // ... await db.query for other functions ...
          }
        ```
*   **`down()`**: (Less common in the provided files but conceptually present)
    *   Would be used to tear down or remove database-specific functions or schema elements defined in `up()`. `User.ts` includes an example.
*   **`create(form: I<ModelName>Form, ...args)`**:
    *   Takes a form object and any other necessary arguments (e.g., `userId`).
    *   Interacts with the database (e.g., `db.create()`) to create a new record.
    *   Often involves setting `createdAt`, `updatedAt`, and establishing relationships.
    *   Returns the created record or `undefined` on error.
*   **`get(id: string | RecordId)`**:
    *   Retrieves a single record by its ID using `db.select()`.
    *   Returns the record or `undefined` if not found or on error.
*   **`getAll()` / `getUser<RelatedModels>(userId: string | RecordId)`**:
    *   Retrieves multiple records. `getAll()` fetches all records of a type (sometimes with `FETCH` for related data).
    *   Methods like `getUserProjects` or `getUserImports` fetch records related to a specific user, often using custom SurrealQL functions defined in `up()`.
*   **`update(id: string | RecordId, form: Partial<I<ModelName>Form>)`**:
    *   Updates an existing record using `db.merge()`.
    *   Typically updates the `updatedAt` timestamp.
*   **`delete(id: string | RecordId)`**:
    *   Deletes a record by its ID using `db.delete()`.
    *   May also involve deleting related records or relationships (cascading deletes).
*   **Relationship Management Methods**:
    *   `connectTo<OtherModel>(modelId, otherModelId)`: Creates a relationship (edge) between two records using `db.query("RELATE ...")`.
    *   `disconnectFrom<OtherModel>(modelId, otherModelId)`: Removes a relationship.
    *   `checkUserOwnership(modelId, userId)`: Verifies if a user has an ownership relationship with a specific record.

### 5. Database Interaction
*   Models use `await getDatabase()` to obtain a SurrealDB database instance.
*   `StringRecordId` is frequently used to ensure IDs are in the correct format for SurrealDB queries, especially when dealing with string inputs that need to be treated as record IDs.
*   Common SurrealDB client methods used:
    *   `db.create(tableName, data)`
    *   `db.select(recordId)`
    *   `db.merge(recordId, dataToMerge)`
    *   `db.delete(recordId)`
    *   `db.query(queryString, queryVariables)`: For executing raw SurrealQL queries, especially for `RELATE`, `DEFINE FUNCTION`, and complex `SELECT` statements.
    *   `db.run(functionName, params)`: For executing pre-defined SurrealQL functions.
    *   `db.insert(tableName, data)`: Similar to `create`, seen in `GenerativeSummary`.

### 6. Error Handling
*   Most database operations are wrapped in `try...catch` blocks.
*   Errors are typically logged to the console using `console.error()`.
*   Functions often return `undefined` or a boolean indicating failure in case of an error. In some cases, errors might be re-thrown.

### 7. Asynchronous Operations
*   Nearly all methods interacting with the database are `async` and return `Promise`s.

## Specific Model Patterns and Examples

*   **`User` Model (`Twig/app/database/models/user.ts`)**:
    *   Manages users, roles (`Role` class), and tokens (`Token` class).
    *   Includes methods for authentication-related tasks like generating access/refresh tokens.
    *   Defines functions like `fn::user_has_role`.

*   **`Idea` Model (`Twig/app/database/models/ideas/index.ts`)**:
    *   A complex model for managing "ideas".
    *   Features:
        *   Computed fields (`attachComputedFields`).
        *   Graph-like connections between ideas (`connect`, `disconnect`, `getConnections`).
        *   Derived ideas and cascading updates/deletions (`IdeaDerivedCascade` class, `runDerivedCascade`, `runDeleteCascade`).
        *   Semantic search capabilities (`findSimilar`, `semanticSearch`, `searchIdeas`).
        *   Integration with embeddings (`loadEmbeddings`, `updateEmbeddings`).
        *   Content synchronization (`synchronizeContentPlain`).
        *   Generative summaries (delegated or related to `GenerativeSummary`).

*   **`GenerativeSummary` Model (`Twig/app/database/models/ideas/summaries.ts`)**:
    *   Works in conjunction with the `Idea` model.
    *   Uses a Language Model (LM) via `../../../semantics/lm` to generate various types of summaries from idea content.
    *   Defines an `LMSchema` (`GenerativeSummarySchema`) for the expected output of the LM.
    *   Methods like `create` (generates summary for an idea), `refreshGenerativeSummary`, and `cascadeGenerativeSummary`.

*   **`UserFile` Model (`Twig/app/database/models/userfile.ts`)**:
    *   Manages user-uploaded files.
    *   Integrates with AWS S3 for file storage (`writeToS3`, `deleteFromS3`, `downloadLinkS3`, `getStreamS3`).
    *   Stores metadata about files (S3 key, original name, MIME type, size).
    *   Includes helper functions like `sanitizeFilename` and `constructS3Key`.

*   **`Import` Model (`Twig/app/database/models/import.ts`)**:
    *   Handles the concept of "imports," likely for batch-creating or associating ideas with a source.
    *   Manages relationships between imports, users (`initiated_import`), and ideas (`imported`).

*   **`Project` and `Tag` Models (`Twig/app/database/models/project.ts`, `Twig/app/database/models/tag.ts`)**:
    *   Follow standard patterns for entities that can be owned by users and related to ideas.
    *   `Project`: `User -> owns -> Project`, `Project -> contains -> Idea`.
    *   `Tag`: `User -> owns_tag -> Tag` (or just `owns` in the code), `Tag -> describes -> Idea`.
    *   Both define SurrealQL functions in their `up()` methods to fetch user-specific items or related items (e.g., `fn::get_user_projects`, `fn::get_project_ideas`).

*   **`Feedback` Model (`Twig/app/database/models/feedback.ts`)**:
    *   A straightforward model for collecting user feedback.
    *   Relates feedback to a user.

### Empty Models
*   `log.ts` and `meta.ts` were found to be empty, suggesting they might be placeholders or for future use.

## Aggregation of `up()` Methods
The file `Twig/app/database/models/index.ts` exports a `modelsUp` async function. This function is responsible for calling the static `up()` method on all relevant models, ensuring that any necessary database functions or schema initializations are performed when the application starts.

```Twig/app/database/models/index.ts#L6-L17
export const modelsUp = async () => {
  try {
    console.info("Running model up functions.");
    await User.up();
    await Role.up();
    await Token.up();
    await Idea.up();
    await UserFile.up();
    await Import.up();
    // await Project.up(); // Assuming Project and Tag would also be here if they have up methods
    // await Tag.up();
  } catch (error) {
    console.error("There was an error updating models: ", error);
  }
};
```
*(Note: The `Project.up()` and `Tag.up()` calls are commented out in the actual file but are included here for completeness as they do have `up` methods).*

## Writing New Model Files: Guidelines

When creating new model files, adhere to the following patterns:

1.  **Define Interfaces**:
    *   `I<ModelName>` for the full record structure.
    *   `I<ModelName>Form` for creation/update payloads, omitting auto-generated fields.
    *   Interfaces for any relationship tables/edges.
2.  **Create a Class**:
    *   `<ModelName>` class.
    *   Implement static methods for CRUD operations (`create`, `get`, `update`, `delete`, `getAll` variants).
3.  **Database Interaction**:
    *   Use `await getDatabase()` to get the DB instance.
    *   Use `StringRecordId` for ID consistency.
    *   Prefer SurrealDB client methods (`create`, `select`, `merge`, `delete`, `query`, `run`).
4.  **`up()` Method**:
    *   If your model requires custom SurrealQL functions or specific schema setup, define them in an `async static up()` method.
    *   Ensure this `up()` method is called in `Twig/app/database/models/index.ts`'s `modelsUp` function.
5.  **Relationships**:
    *   Define relationship interfaces.
    *   Use `RELATE` queries (via `db.query()`) to establish connections between records.
    *   Provide methods to manage these relationships (e.g., `connectToUser`, `checkOwnership`).
6.  **Error Handling**:
    *   Wrap database calls in `try...catch`.
    *   Log errors using `console.error`.
    *   Return meaningful values (e.g., the entity, `undefined`, boolean).
7.  **Asynchronicity**: Use `async/await` for all database operations.
8.  **Timestamps**: Manage `createdAt` and `updatedAt` fields appropriately. `createdAt` is usually set on creation, and `updatedAt` on creation and updates.
9.  **Consider Cascades**: For models with dependent data or relationships, implement logic for cascading deletes or updates if necessary (see `Idea` and `GenerativeSummary` for examples).