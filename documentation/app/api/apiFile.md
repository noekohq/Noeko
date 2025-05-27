# API Files Documentation

API files in this project are built using Express.js and are responsible for handling incoming HTTP requests, processing them, interacting with data models or services, and sending back responses. They define the routes, middleware, and logic for the application's API endpoints.

## Core Concepts

### 1. Location
API route files are located in the `Twig/app/api/` directory. Each file typically corresponds to a major resource or a group of related functionalities.

### 2. File Naming
- API files are named after the primary resource they manage (e.g., `users.ts`, `ideas.ts`, `files.ts`).
- A central `Twig/app/api/index.ts` file serves as the main router, aggregating all other API routers.

### 3. Structure of an API File

Most API files (`<resource>.ts`) share a common structure:

*   **Imports**:
    *   `Router` from `"express"`.
    *   Relevant data models (e.g., `User` from `"../database/models/user"`, `Idea` from `"../database/models/ideas"`).
    *   Middleware functions (e.g., `checkToken`, `checkIsSuperuser` from `"../middleware/auth"`).
    *   Utility functions (e.g., `getFromReq` from `"../utils/requests"`).
    *   Type definitions for request/response bodies or user data.

*   **Router Initialization**:
    *   A new Express Router instance is created: `const router = Router();`.

*   **Middleware Application (Router-level)**:
    *   Middleware common to all routes within the file can be applied using `router.use()`.
        ```Twig/app/api/feedback.ts#L12-L13
        // Apply to all routes in this router
        router.use(checkToken);
        router.use(disallowDisabled);
        ```

*   **Route Definitions**:
    *   Routes are defined using HTTP verb methods on the router instance: `router.get()`, `router.post()`, `router.put()`, `router.delete()`.
    *   Each route takes a path string and one or more handler functions (often `async`).
    *   Middleware can also be applied at the route-level.
        ```Twig/app/api/ideas.ts#L106-L107
        router.post("/ideas", checkToken, disallowDisabled, async (req, res) => {
          // ... handler logic ...
        });
        ```

*   **Export**:
    *   The configured router instance is exported: `export default router;`.

### 4. The Main API Router (`Twig/app/api/index.ts`)
This file imports all the individual resource routers and mounts them on their respective base paths.

```Twig/app/api/index.ts#L11-L22
const router = Router();

router.use("/dashboard", dashboardRouter);
router.use("/graph", graphRouter);
router.use("/ideas", ideasRouter);
router.use("/files", fileRouter);
router.use("/users", userRouter);
router.use("/search", searchRouter);
router.use("/feedback", feedbackRouter);
router.use("/imports", importRouter);

export default router;
```

## Common Patterns and Practices

### 1. Request Handling
*   **Route Handlers**: Implemented as `async (req, res) => { ... }` functions.
*   **Accessing Request Data**:
    *   Route parameters: `req.params` (e.g., `const { id } = req.params;` for a route like `/resource/:id`).
    *   Query string parameters: `req.query` (e.g., `const page = Number(req.query.page);`).
    *   Request body: `req.body` (typically parsed as JSON by Express middleware).
    *   Authenticated User: The `getFromReq<IUser>(req, "user")` utility is commonly used to retrieve user information attached to the request object by authentication middleware.
        ```Twig/app/api/dashboard.ts#L11-L14
        router.get("/", async (req, res) => {
          try {
            const user = await getFromReq<ISafeUser>(req, "user");
            if (!user) {
        ```
*   **Input Validation**:
    *   Handlers often start by validating `req.body`, `req.params`, or `req.query`.
    *   Checks include presence of required fields, data types, and format.
    *   If validation fails, a `4xx` HTTP status code (e.g., 400 Bad Request) is sent with an informative message.
        ```Twig/app/api/feedback.ts#L29-L32
        if (typeof content !== "string" || content.trim() === "") {
          res.status(400).send({ message: "Content is required." });
          return;
        }
        ```

### 2. Working with Authenticated User Data

A common requirement in API endpoints is to access information about the currently authenticated user to authorize actions or fetch user-specific data. This is typically achieved through a combination of authentication middleware and utility functions.

*   **Authentication Middleware (`checkToken`)**:
    *   Most routes that require a logged-in user will first pass through the `checkToken` middleware (or a similar one).
    *   This middleware is responsible for validating an authentication token (e.g., a JWT) sent with the request.
    *   If the token is valid, the middleware decodes it and attaches the user's information (often a "safe" version, excluding sensitive fields like passwords) to the Express `request` object, typically as `req.user`.

*   **Retrieving User Data in Handlers (`getFromReq`)**:
    *   Inside your route handler, you use the `getFromReq` utility function to safely access this user information. This function helps ensure type safety and provides a consistent way to retrieve data attached to the request.
    *   You should provide the expected type of the user object (e.g., `ISafeUser`, `IUser`) to `getFromReq`.

    ```Twig/app/api/dashboard.ts#L11-L17
    router.get(\"/\", async (req, res) => {
      try {
        const user = await getFromReq<ISafeUser>(req, \"user\"); // Retrieve the authenticated user
        if (!user) {
          // This check is crucial. If no user is found, it means authentication failed or was not provided.
          res.status(401).send({ message: \"Unauthorized. User not logged in.\" });
          return;
        }
        // Now you can use user.id or other user properties
        const recentIdeas = await Idea.getUserRecentIdeas(user.id, 10);
    ```

*   **Using User Data**:
    *   **Authorization Checks**: Verify if the user has the necessary permissions for the requested action. This might involve checking roles or direct ownership of a resource.
        ```Twig/app/api/graph.ts#L53-L63
        const { id } = req.params; // Assuming 'id' is the idea ID
        const user = await getFromReq<IUser>(req, \"user\");
        if (!user) {
          res.status(500).json({ message: \"Internal Server Error\" }); // Or 401 Unauthorized
          return;
        }
        const isOwner = await Idea.checkUserOwnership(id, user.id);
        const isSuperuser = await User.checkUserHasRole(user.id, \"role:superuser\");
        if (!isOwner && !isSuperuser) { // Check if user is owner OR superuser
            res.status(403).json({
              message: \"Unauthorized.\",
            });
            return;
        }
        ```
    *   **Fetching User-Specific Data**: Use `user.id` to query the database for records associated with that user.
        ```Twig/app/api/files.ts#L65-L72
        router.get(\"/\", checkToken, disallowDisabled, async (req, res) => {
          try {
            const user = await getFromReq<ISafeUser>(req, \"user\");
            if (!user) {
              res.status(401).json({
                error: \"Unauthorized\",
                message: \"User not found.\",
              });
              return;
            }
            // Fetch files specifically for this user
            const files = await UserFile.getUserFiles(user.id);
        ```
    *   **Associating Data with Users**: When creating new resources, `user.id` is often used to link the new record to the authenticated user.
        ```Twig/app/api/feedback.ts#L19-L41
        router.post(\"/\", async (req, res) => {
          try {
            const user = await getFromReq<IUser>(req, \"user\");
            if (!user || !user.id) {
              res.status(401).send({
                message: \"Unauthorized. User not found or ID is missing.\",
              });
              return;
            }
            // ... (validation of req.body) ...
            const feedbackData: IFeedbackForm = { content, consentToContact, status };
            // Pass user.id to the model's create method
            const feedback = await Feedback.create(feedbackData, user.id);
        ```

Always ensure that the `checkToken` middleware (or equivalent) is applied to routes that require authenticated user information. If `getFromReq(req, \"user\")` returns `undefined` or `null`, it indicates that the user is not authenticated, and you should typically respond with a `401 Unauthorized` status.

### 3. Response Handling
*   **Sending Responses**: `res.send()` or `res.json()` are used.
*   **Standard Response Structure**:
    *   Success:
        ```/dev/null/example.json#L1-4
        {
          "message": "Descriptive success message.",
          "data": { /* payload, e.g., the requested or created resource */ }
        }
        ```
    *   Error:
        ```/dev/null/example.json#L1-4
        {
          "message": "Error description.",
          "error": "Optional detailed error string" // (sometimes just message)
        }
        ```
*   **HTTP Status Codes**: Standard codes are used (e.g., `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`).
*   **Setting Cookies/Headers**: For auth tokens, utility functions like `addAccessTokenToRes` and `addRefreshTokenToRes` are used, which likely set cookies or headers.

### 4. Middleware Usage
*   **Authentication (`checkToken`)**: Verifies the user's authentication token. Applied to most routes requiring login.
    ```Twig/app/api/dashboard.ts#L7-L7
    router.use(checkToken);
    ```
*   **Authorization**:
    *   `checkIsSuperuser`: Restricts access to superusers.
        ```Twig/app/api/feedback.ts#L70-L70
        router.use(checkIsSuperuser);
        ```
    *   `disallowDisabled`: Prevents disabled users from accessing routes.
        ```Twig/app/api/feedback.ts#L13-L13
        router.use(disallowDisabled);
        ```
*   **File Uploads (`multer`)**: Used in `Twig/app/api/files.ts` to handle `multipart/form-data` for file uploads.
    ```Twig/app/api/files.ts#L16-L22
    router.post(
      "/",
      checkToken,
      disallowDisabled,
      upload.single("userFile"), // multer middleware
      async (req, res) => {
    ```
    The `upload.single("fieldName")` middleware processes the uploaded file and makes it available via `req.file`.

### 5. Error Handling
*   All route handlers wrap their logic in `try...catch` blocks.
*   Caught errors are logged to the console using `console.error()`.
*   A generic `500 Internal Server Error` response is sent to the client for unexpected errors, often hiding specific error details for security.
    ```Twig/app/api/dashboard.ts#L24-L29
    } catch (error) {
        console.error("Error getting user dashboard: ", error);
        res.status(500).send({
          message: "Internal Server Error",
        });
      }
    ```

### 6. Interaction with Models and Services
*   API handlers call static methods on data models (e.g., `User.create()`, `Idea.graph()`, `Feedback.getAll()`) to perform database operations.
*   For more complex operations or to encapsulate business logic not directly tied to a single database table, services are used (e.g., `ImporterManager` in `Twig/app/api/import.ts`, `Search` service in `Twig/app/api/search.ts`).

## Writing New API Files: Guidelines

1.  **Create a New File**: In `Twig/app/api/`, name it descriptively (e.g., `widgets.ts`).
2.  **Standard Imports**: Include `Router` from `express`, necessary models, middleware, and types.
3.  **Initialize Router**: `const router = Router();`.
4.  **Apply Middleware**:
    *   Use `router.use()` for middleware applicable to all routes in the file (e.g., `checkToken`).
    *   Apply middleware per-route if needed.
5.  **Define Routes**:
    *   Use `router.get()`, `router.post()`, etc. with a clear path (e.g., `/`, `/:id`, `/:id/sub-resource`).
    *   Make handlers `async`.
6.  **Request Handling**:
    *   Retrieve user data using `getFromReq(req, "user")` if authenticated.
    *   Thoroughly validate `req.body`, `req.params`, and `req.query`. Return `4xx` errors for invalid input.
7.  **Business Logic**:
    *   Call appropriate methods on your data models or services.
8.  **Response Handling**:
    *   Send responses using `res.status(code).json({ message: "...", data: ... })`.
    *   Use standard HTTP status codes.
9.  **Error Handling**:
    *   Wrap all handler logic in `try...catch`.
    *   Log errors server-side.
    *   Return `500` for unexpected errors.
10. **Export Router**: `export default router;`.
11. **Register in Main Router**: Add your new router to `Twig/app/api/index.ts`.
    ```/dev/null/example.js#L1-2
    // In Twig/app/api/index.ts
    import widgetRouter from "./widgets";
    // ...
    router.use("/widgets", widgetRouter);
    ```

By following these patterns, you ensure consistency and maintainability across the API codebase.