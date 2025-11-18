// FIX: Import `ReactNode` to resolve the 'React' namespace error.
import type { ReactNode } from 'react';

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface AgentPlan {
    overview: string;
    fileStructure: { name: string; description: string }[];
    designSystem: {
        palette: { name: string; hex: string }[];
        typography: { primary: string; secondary?: string };
    };
    componentBreakdown: { name: string; description: string }[];
}


// FIX: Removed self-import of 'Message' which caused a conflict with the local declaration.
export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  image?: UploadedImage;
  elementHtml?: string;
  isThinking?: boolean;
  isStreaming?: boolean;
  files?: File[];
  groundingMetadata?: GroundingChunk[];
  plan?: AgentPlan;
}

export interface UploadedImage {
  base64: string;
  mimeType: string;
}

export interface SelectedElement {
    id: string;
    html: string;
}

export interface ApiKeys {
    openRouter: string | null;
    openRoute: string | null;
    groq: string | null;
    githubToken: string | null;
    supabaseUrl: string | null;
    supabaseAnonKey: string | null;
}

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
}

// FIX: Removed 'laptop' from the Device type as it is not supported by UI components, resolving a type error in App.tsx.
export type Device = 'pc' | 'tablet' | 'mobile';
export type View = 'preview' | 'code' | 'split' | 'browser';
export type InteractionMode = 'select' | 'navigate';


export interface File {
    name: string;
    content: string;
    language: 'html' | 'css' | 'javascript' | 'markdown';
}

export interface LiveFile extends File {
    status: 'streaming' | 'completed';
}

export interface HistoryState {
    files: File[];
}

export interface Chat {
    id: string;
    name: string;
    createdAt: number;
    history: HistoryState[];
    historyIndex: number;
    messages: Message[];
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
  };
  default_branch: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
  };
}

export interface Command {
  id: string;
  name: string;
  section: string;
  // FIX: Use the imported `ReactNode` type directly.
  icon: ReactNode;
  action: () => void;
  shortcut?: string;
  keywords?: string;
}