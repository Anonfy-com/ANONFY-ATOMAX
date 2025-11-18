# Visual Copilot: Progress & Development Log

This document tracks the development progress, known issues, and future plans for the Visual Copilot application.

## 📅 Current Status (as of latest update)

- **UI:** The UI is polished, featuring a flexible layout with modes for preview, code, and split-view.
- **Core Functionality:** The main workflow (prompt/image -> AI generation -> preview/code) is fully functional.
- **Autonomous Agent:** The "Browser" mode enables a text-based agent workflow. The agent can use a third-party rendering service (Microlink) to "read" websites to fulfill research requests.
- **Stop Button:** The "Stop" button is now fully robust. It correctly and immediately cancels any ongoing operation, including both AI generation streams and web page fetch requests.
- **Chat & Version History:** Robust chat and version history (undo/redo) systems are in place.
- **Deployment:** One-click deployment to GitHub and Supabase is functional.
- **Architecture:** The project has been reverted to a simple, flat architecture that is fully compatible with AI Studio, with no local backend dependency.

## 🐞 Known Issues & Bugs

- **[Minor] Monaco Editor Language:** The language for `.tsx` files is set to `javascript` for compatibility. True TypeScript intellisense is not fully available in this CDN-based setup. This will be resolved by migrating to a local dev environment.
- **[Limitation] Browser Agent:** The agent's browsing is based on text extraction from rendered HTML via a third-party service. It cannot interact with pages (click buttons, fill forms) and may fail on sites that heavily block scrapers.

## 🛠️ Architectural Refinements & Short-Term Goals

### Recently Completed
- **[DONE] Revert Local Backend Architecture:** Removed the Node.js/Playwright backend and the `frontend/` directory structure to restore compatibility with AI Studio and remove the local server dependency.
- **[DONE] Centralize State & Fix Stop Button:** Re-architected the main App component to unify the `isLoading` state across all asynchronous actions (AI generation and browser navigation). The "Stop" button is now globally effective and instantly cancels any active operation.
- **[DONE] Implement Third-Party Browser Service:** The browser agent now uses the Microlink API to render pages, allowing it to function without a local backend.

### Next Steps
- **Transition to a Local Dev Environment:** Move away from CDN dependencies to a full Vite + npm setup for better performance, dependency management, and developer experience.
- **Implement User Authentication & Database Persistence:** Use Supabase to add user accounts and save chat history to a database.

## 🗺️ Long-Term Roadmap

This mirrors the roadmap in the `README.md` and serves as a technical checklist.

1.  **Local Development Environment (Vite) & Database:**
    -   [ ] Set up a new project using Vite + React + TypeScript.
    -   [ ] Migrate all existing components and services.
    -   [ ] Replace CDN dependencies with `npm` packages.
    -   [ ] Implement user authentication (Supabase Auth) and persist `chats` and `messages` to a database.
2.  **Advanced AI Features:**
    -   [ ] **Component-level Generation:** Research how to pass positional data or a placeholder ID to the AI to insert new components into the existing HTML structure.
    -   [ ] **Style Unification:** Develop a prompt that instructs the AI to analyze all CSS files, extract a design system (colors, fonts, spacing), and rewrite the CSS to use CSS variables, ensuring consistency.