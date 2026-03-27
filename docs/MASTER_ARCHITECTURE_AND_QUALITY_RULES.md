# Master Architecture & Quality Rules

This document serves as the absolute source of truth for architecture conventions, code quality constraints, and system design within the CMS-V2 Monorepo.

---

## 1. System Architecture

### 1.1 Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS, Zustand (client state), React Query (server state).
- **Backend:** Node.js, Express, Mongoose, Socket.IO.
- **Infrastructure:** BullMQ (job queues), Redis (caching/queue state), AWS S3 (storage).
- **Structure:** Monorepo strictly divided into `client`, `server`, and `shared`.

### 1.2 Monorepo Guidelines
- **`shared/` Directory:** Always use the `shared` module for cross-domain logic. Enums, interfaces, Zod/Joi validation schemas, and constants required by both environments must live here. Never duplicate definitions.

### 1.3 Backend Architecture (Feature-Modular Layout)
The backend pipeline relies strictly on a decoupled, feature-modular design.
- **Domain Structure:** Features (e.g., `auth`, `users`, `teams`) must be siloed logically.
- **The 4-File Pattern:** Every feature must strictly follow this file separation:
  1. `[feature].routes.ts`: Binds controllers to endpoints.
  2. `[feature].controller.ts`: Extracts request data, invokes services, returns responses.
  3. `[feature].service.ts`: Core business logic and database interactions.
  4. `[feature].validation.ts`: Request payload rules and schema invariants.
- **Request Pipeline:** ` helmet -> CORS -> body-parser -> custom middlewares -> routes -> central error handler`.
- **Database Rules:** Mongoose schemas must include `{ timestamps: true }` by default.

### 1.4 Frontend Architecture
- **Routing:** Proceed with page-based routing layouts.
- **Modularity:** Separate complex business operations into custom React hooks (e.g., `useTeamSync.ts`). Keep React components strictly focused on UI presentation.
- **UI & Styling:** Use Tailwind CSS exclusively. No inline styles or `.css` files unless overriding complex third-party library constraints. Obey the `shadcn/ui` principles (functional, accessible, composition-based).

### 1.5 Security & Data Handling
- **Async Execution:** Express asynchronous route handlers must be wrapped in a central `catchAsync` wrapper to safeguard against unhandled rejections.
- **Authentication:** Use strict HTTP-Only, Secure cookies for sensitive tokens (JWTs). Ensure explicit refresh-token rotation rules are followed if implemented.
- **Transparency:** Never leak stack traces, database metadata, or sensitive internal data payloads in HTTP API responses.

---

## 2. The "Anti-Slop" Quality Protocol

This repository adheres to standard "Anti-Slop" guidelines. Vague, lazy, or overly complex code will not pass review.

### 2.1 Comments & Documentation
- **No obvious comments:** Do not explain *what* the code does if it is readily apparent. 
  - *BAD:* `// Calculate total price` right above `const totalPrice = base + tax;`.
  - *GOOD:* Write comments to explain *why* an unusual approach was taken or specifically documented business rules.
- **Self-documenting code over blocks of text:** If you need a large comment to explain a function, the function is too complex and needs refactoring.

### 2.2 Variable & Function Naming
- **Meaningful Identifiers only:** 
  - *BANNED variables:* `data`, `res`, `result`, `temp`, `item`, `val`, `obj`.
  - *REQUIRED:* Name variables according to their precise semantic meaning (e.g., `activeUserList`, `projectQueryConfig`, `normalizedToken`).
- **Action-Object Pattern:** Prefix functions and methods with a descriptive action-verb and the target entity.
  - *BAD:* `processInfo()`, `doTask()`
  - *GOOD:* `parseUserPermissions()`, `dispatchNotificationEvent()`, `calculateInvoiceTotal()`

### 2.3 Clarity Over Cleverness
- Avoid unnecessary one-liners or extreme code golf. Highly nested ternary operators are forbidden.
- If logic is complex, spread it out systematically across distinct, heavily typed variables. 
- *Content-First Design:* Put direct functionality ahead of abstract generic utility generation until reuse is formally required.
