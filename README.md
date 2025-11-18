# Visual Copilot: AI Web Design Partner

Visual Copilot is a cutting-edge web application that empowers users to design and develop websites through a conversational interface. By leveraging the power of multimodal AI models, users can upload screenshots, provide text prompts, or interactively modify elements to generate modern, professional, and fully responsive web projects in real-time.

## ✨ Key Features

- **Multimodal Input:** Start your design process with a text prompt, an image reference, or both.
- **Autonomous Web Agent:** In "Browser" mode, the AI can perform research tasks by planning actions and using a web rendering service to "read" websites and find information for you.
- **Interactive Refinement:** Use "Select Mode" to click on any element in the live preview and give the AI specific instructions for changes ("make this button green").
- **Real-time Preview:** See the generated website instantly in a preview pane with device toggles (Desktop, Tablet, Mobile).
- **Live Code Editing:** View and edit the generated HTML, CSS, and JavaScript files in a built-in Monaco editor. Changes are reflected in the preview.
- **Multi-Model Support:** Seamlessly switch between various powerful AI models, including Google Gemini, Groq's ultra-fast LLMs, and a variety of models via OpenRouter.
- **Chat & Version History:** Manage multiple design projects (chats) and navigate through the entire generation history with undo/redo functionality.
- **One-Click Deployment:** Deploy your final project directly to GitHub or Supabase Storage with integrated deployment modals.

## 🚀 Tech Stack

- **Frontend:** React, TypeScript
- **Styling:** Tailwind CSS (loaded via CDN for rapid prototyping)
- **Code Editor:** Monaco Editor
- **AI Integration:** `@google/genai` SDK, and direct REST API calls for Groq and OpenRouter.
- **Browser Rendering:** Uses the [Microlink API](https://microlink.io/) to render web pages for the AI agent.
- **State Management:** React Hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useReducer`)

## 📂 Project Structure

The project uses a simple, flat structure suitable for rapid development within AI Studio.

```
/
├── components/       # Reusable React components
├── services/         # Logic for external API interactions (AI, GitHub, Browser)
├── state/            # Centralized state management logic (reducers)
├── utils/            # General utility functions
├── App.tsx           # Main application component
├── index.tsx         # Application entry point
└── index.html        # The main HTML file
```

## 🗺️ Roadmap & Future Enhancements

This project has a strong foundation, but there's always room for growth. Here is the strategic roadmap:

1.  **Local Development Environment & Database:**
    -   Transition from the CDN-based setup to a local development environment using a build tool like **Vite**.
    -   Persist user chats, API keys, and deployment history to a Supabase database with user authentication.

2.  **Advanced AI Features:**
    -   **Component-level Generation:** Allow users to select a region and prompt the AI to generate a specific component (e.g., "add a pricing table here").
    -   **Style Unification:** Implement a feature where the AI can analyze the entire project and unify the CSS into a consistent design system.
    -   **Accessibility Audits:** Integrate an AI-powered accessibility check that scans the generated code and suggests improvements.

3.  **Enhanced Agent Capabilities:**
    -   Explore more advanced browser automation services to allow the agent to perform `CLICK` and `TYPE` actions, enabling it to fill out forms and navigate through complex user flows autonomously.