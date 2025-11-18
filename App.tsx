import React, { useState, useEffect, useCallback, useMemo, useRef, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Component Imports
import { Header } from './components/Header.tsx';
import { AssistantPanel } from './components/AssistantPanel.tsx';
import { MainContentWelcome } from './components/MainContentWelcome.tsx';
import { PreviewFrame } from './components/PreviewFrame.tsx';
import { CodeDisplay } from './components/CodeDisplay.tsx';
import { LiveGenerationView } from './components/LiveGenerationView.tsx';
import { Modal } from './components/Modal.tsx';
import { DeployModal } from './components/DeployModal.tsx';
import { DeploySupabaseModal } from './components/DeploySupabaseModal.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';

// Type Imports
import type { Message, UploadedImage, SelectedElement, Device, View, InteractionMode, Chat, HistoryState, File, ApiKeys, GitHubRepo, GitHubBranch, LiveFile, Command, GroundingChunk } from './types.ts';

// Service Imports
import { generateHtmlStream } from './services/aiService.ts';
import { fetchUserRepos, fetchRepoBranches, deployToGithub } from './services/githubService.ts';
import { deployToSupabase } from './services/supabaseService.ts';
import { navigateAndExtract } from './services/browserService.ts';

// Utility Imports
import { debounce } from './utils/formatters.ts';

// State Management Imports
import { chatReducer, initialChatState } from './state/chatReducer.ts';
import { modalReducer, initialModalState } from './state/modalReducer.ts';

// Constants Import
import { ALL_FREE_MODELS, GEMINI_FLASH_MODEL, GEMINI_PRO_MODEL } from './constants.ts';
import { ArrowDownTrayIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon, CodeBracketIcon, CursorArrowRaysIcon, EyeIcon, GitHubIcon, MagnifyingGlassIcon, PlusIcon, RectangleGroupIcon, SupabaseIcon } from './components/Icons.tsx';


// Add JSZip to the window type for the zip download functionality
declare global {
    interface Window {
        JSZip: any;
    }
}

export const App: React.FC = () => {
    const [chatState, chatDispatch] = useReducer(chatReducer, initialChatState);
    const { chats, activeChatId } = chatState;

    const [modalState, modalDispatch] = useReducer(modalReducer, initialModalState);

    // --- UI & Core State ---
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [view, setView] = useState<View>('preview');
    
    // --- Code Generation & Preview State ---
    const [liveGenerationState, setLiveGenerationState] = useState<{ files: LiveFile[] }>({ files: [] });
    const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
    const [selectedElements, setSelectedElements] = useState<SelectedElement[]>([]);
    const [device, setDevice] = useState<Device>('pc');
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('navigate');
    const [liveFiles, setLiveFiles] = useState<File[] | null>(null);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    
    // --- AI Configuration State ---
    const [selectedModel, setSelectedModel] = useState<string>(GEMINI_FLASH_MODEL);
    const [useTailwind, setUseTailwind] = useState<boolean>(true);
    const [systemPrompt, setSystemPrompt] = useState<string>('');
    const [useGoogleSearch, setUseGoogleSearch] = useState<boolean>(false);
    
    // --- Abort Controllers for Cancellable Actions ---
    const streamControllerRef = useRef<AbortController | null>(null);
    const browserControllerRef = useRef<AbortController | null>(null);

    // --- API Keys & Deployment State ---
    const [apiKeys, setApiKeys] = useState<ApiKeys>({ openRouter: '', openRoute: '', groq: '', githubToken: '', supabaseUrl: '', supabaseAnonKey: '' });
    const [userRepos, setUserRepos] = useState<GitHubRepo[]>([]);
    const [repoBranches, setRepoBranches] = useState<GitHubBranch[]>([]);
    const [isFetchingRepos, setIsFetchingRepos] = useState(false);
    const [isFetchingBranches, setIsFetchingBranches] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployError, setDeployError] = useState<string | null>(null);
    const [isDeployingToSupabase, setIsDeployingToSupabase] = useState(false);
    const [supabaseDeployError, setSupabaseDeployError] = useState<string | null>(null);


    // Load state from localStorage on initial render
    useEffect(() => {
        try {
            const savedChats = window.localStorage.getItem('ai_chats');
            const savedActiveId = window.localStorage.getItem('ai_activeChatId');
            const savedKeys = window.localStorage.getItem('ai_apiKeys');
            const savedUseTailwind = window.localStorage.getItem('ai_useTailwind');
            const savedSystemPrompt = window.localStorage.getItem('ai_systemPrompt');
            const savedUseGoogleSearch = window.localStorage.getItem('ai_useGoogleSearch');

            let loadedChats: Chat[] = [];
            let loadedActiveId: string | null = null;

            if (savedChats) {
                const parsedChats = JSON.parse(savedChats);
                if (Array.isArray(parsedChats)) {
                    loadedChats = parsedChats
                        .map((chat: any): Chat | null => {
                            if (!chat || typeof chat.id !== 'string') return null;
                            const sanitizedMessages = (chat.messages || []).filter((msg: any) => 
                                msg && typeof msg.id === 'string' && typeof msg.role === 'string'
                            );
                            const sanitizedHistory = Array.isArray(chat.history) && chat.history.length > 0 
                                ? chat.history 
                                : [{ files: [] }];
                            const sanitizedHistoryIndex = typeof chat.historyIndex === 'number' && chat.historyIndex >= 0 && chat.historyIndex < sanitizedHistory.length
                                ? chat.historyIndex
                                : 0;
                            return {
                                id: chat.id,
                                name: typeof chat.name === 'string' ? chat.name : 'Untitled Chat',
                                createdAt: typeof chat.createdAt === 'number' ? chat.createdAt : Date.now(),
                                history: sanitizedHistory,
                                historyIndex: sanitizedHistoryIndex,
                                messages: sanitizedMessages,
                            };
                        })
                        .filter((chat): chat is Chat => chat !== null);
                }
            }
            
            if (loadedChats.length > 0) {
                loadedActiveId = savedActiveId && loadedChats.some(p => p.id === savedActiveId) ? savedActiveId : loadedChats[0].id;
            }

            chatDispatch({ type: 'LOAD_STATE', payload: { chats: loadedChats, activeChatId: loadedActiveId } });

            if (savedKeys) setApiKeys(prevKeys => ({ ...prevKeys, ...JSON.parse(savedKeys) }));
            if (savedUseTailwind) setUseTailwind(JSON.parse(savedUseTailwind));
            if (savedSystemPrompt) setSystemPrompt(savedSystemPrompt);
            if (savedUseGoogleSearch) setUseGoogleSearch(JSON.parse(savedUseGoogleSearch));
        } catch (e) {
            console.error("Could not access or parse local storage:", e);
            chatDispatch({ type: 'CREATE_CHAT' });
        }
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        try {
            window.localStorage.setItem('ai_chats', JSON.stringify(chats));
            if (activeChatId) window.localStorage.setItem('ai_activeChatId', activeChatId);
            window.localStorage.setItem('ai_apiKeys', JSON.stringify(apiKeys));
            window.localStorage.setItem('ai_useTailwind', JSON.stringify(useTailwind));
            window.localStorage.setItem('ai_systemPrompt', systemPrompt);
            window.localStorage.setItem('ai_useGoogleSearch', JSON.stringify(useGoogleSearch));
        } catch (e) {
            console.error("Could not save to local storage:", e);
        }
    }, [chats, activeChatId, apiKeys, useTailwind, systemPrompt, useGoogleSearch]);
    
    // Derived state for convenience
    const activeChat = useMemo(() => chats.find(p => p.id === activeChatId), [chats, activeChatId]);
    const filesFromHistory = activeChat?.history[activeChat.historyIndex]?.files || [];
    const files = liveFiles || filesFromHistory;
    const messages = activeChat?.messages || [];
    const isStreamingResponse = activeChat?.messages[activeChat.messages.length - 1]?.isStreaming || false;
    
    useEffect(() => {
        setLiveFiles(null);
    }, [activeChat?.historyIndex, activeChatId]);


    // --- Core Action Handlers ---
    const handleStopGeneration = useCallback(() => {
        streamControllerRef.current?.abort();
        browserControllerRef.current?.abort();
        setIsLoading(false);
    }, []);

    const pushToHistory = useCallback((state: HistoryState) => {
        chatDispatch({ type: 'PUSH_TO_HISTORY', payload: state });
        setLiveFiles(null);
    }, []);

    const handleSendMessage = useCallback(async (prompt: string, image: UploadedImage | null = null) => {
        if (!activeChat) return;

        streamControllerRef.current = new AbortController();
        browserControllerRef.current = new AbortController();
        let isNavigating = false;
        
        // Always set loading to true at the beginning of the entire operation
        setIsLoading(true);

        const userMessage: Message = { id: uuidv4(), role: 'user', content: prompt, image, elementHtml: selectedElements.length > 0 ? selectedElements.map(el => el.html).join('\n') : undefined };
        const thinkingMessage: Message = { id: uuidv4(), role: 'model', content: '...', isThinking: true, isStreaming: true };
        chatDispatch({ type: 'UPDATE_MESSAGES', payload: [...messages, userMessage, thinkingMessage] });
        
        setLiveGenerationState({ files: [] });
        setUploadedImage(null);
        setSelectedElements([]);
        setInteractionMode('navigate');
        
        try {
            const stream = generateHtmlStream(prompt, image, files, selectedElements, selectedModel, apiKeys, useTailwind, systemPrompt.trim(), useGoogleSearch, view, null, streamControllerRef.current.signal);
            
            let finalFiles: File[] = [];
            let finalGroundingMetadata: GroundingChunk[] = [];
            let finalContent = '';
            
            for await (const event of stream) {
                switch (event.type) {
                    case 'agent_plan': chatDispatch({ type: 'SET_AGENT_PLAN', payload: event.plan }); break;
                    case 'file_create': setLiveGenerationState(prev => ({ files: [...prev.files, { ...event.file, content: '', status: 'streaming' }] })); break;
                    case 'file_chunk': setLiveGenerationState(prev => ({ files: prev.files.map(f => f.name === event.name ? { ...f, content: f.content + event.chunk } : f) })); break;
                    case 'file_complete': setLiveGenerationState(prev => ({ files: prev.files.map(f => f.name === event.name ? { ...f, status: 'completed' } : f) })); break;
                    case 'metadata': finalGroundingMetadata = event.data; break;
                    case 'result':
                        finalFiles = event.data;
                        if (event.fallbackText) finalContent = event.fallbackText;
                        break;
                }
            }
            
            chatDispatch({ type: 'FINISH_STREAMING', payload: { content: finalContent, files: finalFiles, groundingMetadata: finalGroundingMetadata } });

            const navRegex = /\[ACTION:BROWSER_NAVIGATE\("([^"]+)"\)\]/;
            const navMatch = finalContent.match(navRegex);

            if (view === 'browser' && navMatch && navMatch[1]) {
                isNavigating = true; // Flag that a navigation action is happening
                const url = navMatch[1];
                
                const navMessage: Message = { id: uuidv4(), role: 'system', content: `Navigating to ${url}...` };
                chatDispatch({ type: 'UPDATE_MESSAGES', payload: [...activeChat.messages, userMessage, thinkingMessage, navMessage] });

                try {
                    const { html } = await navigateAndExtract(url, browserControllerRef.current.signal);
                    if (html) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, "text/html");
                        const readableText = doc.body.textContent?.replace(/\s\s+/g, ' ').trim() || "Could not extract text from page.";
                        const continuationPrompt = `I have navigated to the page. Here is the extracted text content. Please analyze it and continue with the plan:\n\n${readableText.slice(0, 10000)}`;
                        // This recursive call will be handled as a separate operation, but we keep isLoading=true
                        await handleSendMessage(continuationPrompt);
                    }
                } catch (navError) {
                    const errorContent = navError instanceof Error ? navError.message : "An unknown navigation error occurred.";
                    const errorMessage: Message = { id: uuidv4(), role: 'system', content: `Navigation failed: ${errorContent}` };
                    chatDispatch({ type: 'UPDATE_MESSAGES', payload: [...activeChat.messages, userMessage, thinkingMessage, errorMessage] });
                }

            } else if (finalFiles.length > 0) {
                 pushToHistory({ files: finalFiles });
            }

        } catch (error) {
            const errorContent = (error instanceof Error && error.name === 'AbortError')
                ? "Generation stopped."
                : `Sorry, I encountered an error: ${error instanceof Error ? error.message : "An unknown error."}`;
            chatDispatch({ type: 'FINISH_STREAMING', payload: { content: errorContent, files: [] } });
        } finally {
            streamControllerRef.current = null;
            browserControllerRef.current = null;
            // Only set loading to false if we are not in the middle of a navigation chain
            if (!isNavigating) {
                setIsLoading(false);
            }
        }
    }, [activeChat, messages, files, selectedElements, selectedModel, apiKeys, useTailwind, systemPrompt, useGoogleSearch, view, pushToHistory]);


    // --- UI & Navigation Handlers ---
    const toggleInteractionMode = () => setInteractionMode(prev => (prev === 'select' ? 'navigate' : 'select'));
    const handleToggleBrowserView = () => setView(prev => prev === 'browser' ? 'preview' : 'browser');
    const handleToggleChatHistory = () => modalDispatch({ type: modalState.type === 'chatHistory' ? 'CLOSE_MODAL' : 'OPEN_MODAL', payload: { type: 'chatHistory' } });
    const handleCreateChat = () => { chatDispatch({ type: 'CREATE_CHAT' }); modalDispatch({ type: 'CLOSE_MODAL' }); };
    const handleSelectChat = (id: string) => { chatDispatch({ type: 'SELECT_CHAT', payload: id }); modalDispatch({ type: 'CLOSE_MODAL' }); };
    const handleOpenRenameModal = (chat: Chat) => modalDispatch({ type: 'OPEN_MODAL', payload: { type: 'rename', data: chat } });
    const handleRenameChat = (newName: string) => {
        if (!newName.trim() || !modalState.data) return;
        chatDispatch({ type: 'RENAME_CHAT', payload: { id: modalState.data.id, newName: newName.trim() } });
        modalDispatch({ type: 'CLOSE_MODAL' });
    };
    const handleOpenDeleteModal = (chat: Chat) => {
        if (chats.length <= 1) { alert("You cannot delete the last chat."); return; }
        modalDispatch({ type: 'OPEN_MODAL', payload: { type: 'delete', data: chat } });
    }
    const handleDeleteChat = () => {
        if (!modalState.data) return;
        chatDispatch({ type: 'DELETE_CHAT', payload: modalState.data.id });
        modalDispatch({ type: 'CLOSE_MODAL' });
    };
    
    // --- History (Undo/Redo) Handlers ---
    const handleUndo = useCallback(() => {
        setLiveFiles(null);
        chatDispatch({ type: 'UNDO' });
    }, []);
    const handleRedo = useCallback(() => {
        setLiveFiles(null);
        chatDispatch({ type: 'REDO' });
    }, []);
    
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && (isLoading || isStreamingResponse)) handleStopGeneration();
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') { e.preventDefault(); e.shiftKey ? handleRedo() : handleUndo(); }
                else if (e.key === 'y') { e.preventDefault(); handleRedo(); }
                else if (e.key === 'k') { e.preventDefault(); setIsCommandPaletteOpen(prev => !prev); }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo, isLoading, isStreamingResponse, handleStopGeneration]);


    // Handle iframe messages (for element selection)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { type, id, html, newContent } = event.data;
            if (type === 'elementSelected') {
                setSelectedElements(prev => prev.find(el => el.id === id) ? prev.filter(el => el.id !== id) : [...prev, { id, html }]);
            } else if (type === 'elementTextChanged') {
                const htmlFile = files.find(f => f.name === 'index.html');
                if (!htmlFile) return;
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlFile.content, 'text/html');
                    const elementToUpdate = doc.querySelector(`[data-ai-id="${id}"]`);
                    if (elementToUpdate) {
                        elementToUpdate.innerHTML = newContent;
                        const hasDoctype = htmlFile.content.trim().toLowerCase().startsWith('<!doctype html>');
                        const updatedHtml = hasDoctype ? `<!DOCTYPE html>\n${doc.documentElement.outerHTML}` : doc.documentElement.outerHTML;
                        const newFiles = files.map(f => f.name === 'index.html' ? { ...f, content: updatedHtml } : f);
                        pushToHistory({ files: newFiles });
                    }
                } catch (e) { console.error("Failed to parse and update HTML for text edit:", e); }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [files, pushToHistory]);

    const handleDownload = async () => {
        if (!files.length || !activeChat) return;
        // Dynamically import JSZip
        const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
        const zip = new JSZip();
        files.forEach(file => zip.file(file.name, file.content));
        zip.generateAsync({ type: 'blob' }).then((blob: Blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeChat.name.replace(/ /g, '_') || 'project'}.zip`;
            a.click();
            URL.revokeObjectURL(url);
        });
    };
    
    // --- GitHub Deployment ---
    const handleDeployClick = async () => {
        if (!apiKeys.githubToken) { alert("Please set your GitHub Personal Access Token in the settings (⚙️) first."); return; }
        modalDispatch({ type: 'OPEN_MODAL', payload: { type: 'deploy' } });
        setDeployError(null);
        setIsFetchingRepos(true);
        try {
            setUserRepos(await fetchUserRepos(apiKeys.githubToken));
        } catch (e) { setDeployError(e instanceof Error ? e.message : "Failed to fetch repositories."); }
        finally { setIsFetchingRepos(false); }
    };

    const handleFetchBranches = useCallback(async (repoFullName: string) => {
        if (!apiKeys.githubToken) return;
        setIsFetchingBranches(true);
        setRepoBranches([]);
        try {
            setRepoBranches(await fetchRepoBranches(repoFullName, apiKeys.githubToken));
        } catch (e) { setDeployError(e instanceof Error ? e.message : `Failed to fetch branches for ${repoFullName}.`); }
        finally { setIsFetchingBranches(false); }
    }, [apiKeys.githubToken]);
    
    const handleDeployToGithub = async (deployConfig: { repoName: string; isNew: boolean; description: string; isPrivate: boolean; branchName: string; commitMessage: string; }) => {
        if (isDeploying || !files.length || !activeChat || !apiKeys.githubToken) return;
        setIsDeploying(true);
        setDeployError(null);
        try {
            await deployToGithub(deployConfig, files, apiKeys.githubToken);
            const repoData = await fetchUserRepos(apiKeys.githubToken);
            const repoFullName = deployConfig.isNew ? repoData.find(r => r.name === deployConfig.repoName)?.full_name : deployConfig.repoName;
            alert(`Successfully deployed to https://github.com/${repoFullName}`);
            modalDispatch({ type: 'CLOSE_MODAL' });
        } catch (error) {
            console.error("GitHub deployment failed:", error);
            setDeployError(error instanceof Error ? error.message : 'Unknown error');
        } finally { setIsDeploying(false); }
    };
    
    // --- Supabase Deployment ---
    const handleDeploySupabaseClick = () => {
        if (!files.length) { alert("Please generate some files before deploying."); return; }
        modalDispatch({ type: 'OPEN_MODAL', payload: { type: 'supabase' } });
        setSupabaseDeployError(null);
    };

    const handleDeployToSupabase = async (config: { projectUrl: string; anonKey: string; }) => {
        if (isDeployingToSupabase || !files.length) return;
        setIsDeployingToSupabase(true);
        setSupabaseDeployError(null);
        try {
            const deployedUrl = await deployToSupabase(files, config.projectUrl, config.anonKey);
            alert(`Successfully deployed! Your site is available at:\n${deployedUrl}`);
            modalDispatch({ type: 'CLOSE_MODAL' });
        } catch (error) {
            console.error("Supabase deployment failed:", error);
            setSupabaseDeployError(error instanceof Error ? error.message : 'Unknown error');
        } finally { setIsDeployingToSupabase(false); }
    };

    // Debounced code saving for Monaco editor
    const pushToHistoryRef = useRef(pushToHistory);
    useEffect(() => { pushToHistoryRef.current = pushToHistory; }, [pushToHistory]);
    const debouncedPushCodeToHistory = useMemo(() => debounce((newFiles: File[]) => { pushToHistoryRef.current({ files: newFiles }); }, 1000), []);
    const handleFileContentChange = (fileName: string, newContent: string) => {
        const currentFiles = liveFiles || filesFromHistory;
        const newFiles = currentFiles.map(f => f.name === fileName ? { ...f, content: newContent } : f);
        setLiveFiles(newFiles);
        debouncedPushCodeToHistory(newFiles);
    };
    
    // Memoized values for performance
    const hasContent = files.length > 0;
    const canUndo = (activeChat?.historyIndex || 0) > 0;
    const canRedo = activeChat ? activeChat.historyIndex < activeChat.history.length - 1 : false;
    const isImageUploadSupported = useMemo(() => !selectedModel.startsWith('groq/'), [selectedModel]);
    const modelsForSelector = useMemo(() => [
        { id: GEMINI_PRO_MODEL, name: 'Gemini 2.5 Pro (Powerful & Vision)' }, { id: GEMINI_FLASH_MODEL, name: 'Gemini Flash (Fast & Default)' },
        { id: 'header-groq', name: 'Groq Ultra-Fast Models', isHeader: true }, ...ALL_FREE_MODELS.groq,
        { id: 'header-image', name: 'Other Vision Models', isHeader: true }, ...ALL_FREE_MODELS.image,
    ], []);

    const commands: Command[] = useMemo(() => {
        const commandList: Command[] = [
            { id: 'new-chat', name: 'New Chat', section: 'Chat', icon: <PlusIcon className="w-4 h-4" />, action: handleCreateChat, keywords: 'create start another conversation' },
            { id: 'toggle-chat-history', name: 'Toggle Chat History', section: 'Chat', icon: <PlusIcon className="w-4 h-4" />, action: handleToggleChatHistory, keywords: 'show hide list conversations projects' },
        ];
        if (hasContent || view === 'browser') {
            commandList.push(
                { id: 'toggle-tailwind', name: `Toggle Tailwind CSS Generation`, section: 'AI', icon: <CodeBracketIcon className="w-4 h-4" />, action: () => setUseTailwind(v => !v), keywords: 'utility classes css framework' },
                { id: 'toggle-google-search', name: `Toggle Google Search`, section: 'AI', icon: <MagnifyingGlassIcon className="w-4 h-4" />, action: () => setUseGoogleSearch(v => !v), keywords: 'web internet grounding' },
                { id: 'view-browser', name: 'Switch to Browser Agent', section: 'Navigation', icon: <EyeIcon className="w-4 h-4" />, action: handleToggleBrowserView, keywords: 'web internet agent research' },
                { id: 'toggle-interaction', name: `Switch to ${interactionMode === 'select' ? 'Navigate' : 'Select'} Mode`, section: 'Interaction', icon: <CursorArrowRaysIcon className="w-4 h-4" />, action: toggleInteractionMode, keywords: 'mouse pointer click' }
            );
        }
        if (hasContent) {
             commandList.push(
                { id: 'view-preview', name: 'Switch to Preview View', section: 'Navigation', icon: <EyeIcon className="w-4 h-4" />, action: () => setView('preview'), keywords: 'design visual' },
                { id: 'view-code', name: 'Switch to Code View', section: 'Navigation', icon: <CodeBracketIcon className="w-4 h-4" />, action: () => setView('code'), keywords: 'editor text' },
                { id: 'view-split', name: 'Switch to Split View', section: 'Navigation', icon: <RectangleGroupIcon className="w-4 h-4" />, action: () => setView('split'), keywords: 'both side-by-side' },
                { id: 'download-zip', name: 'Download Project (.zip)', section: 'Actions', icon: <ArrowDownTrayIcon className="w-4 h-4" />, action: handleDownload, keywords: 'export save files' },
                { id: 'deploy-github', name: 'Deploy to GitHub', section: 'Actions', icon: <GitHubIcon className="w-4 h-4" />, action: handleDeployClick, keywords: 'publish ship git' },
                { id: 'deploy-supabase', name: 'Deploy to Supabase', section: 'Actions', icon: <SupabaseIcon className="w-4 h-4" />, action: handleDeploySupabaseClick, keywords: 'publish ship hosting' }
            );
        }
        if (canUndo) commandList.push({ id: 'undo', name: 'Undo', section: 'History', icon: <ArrowUturnLeftIcon className="w-4 h-4" />, action: handleUndo, shortcut: 'Ctrl+Z', keywords: 'back reverse' });
        if (canRedo) commandList.push({ id: 'redo', name: 'Redo', section: 'History', icon: <ArrowUturnRightIcon className="w-4 h-4" />, action: handleRedo, shortcut: 'Ctrl+Y', keywords: 'forward repeat' });
        return commandList;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasContent, canUndo, canRedo, interactionMode, view, handleCreateChat, handleToggleChatHistory, setView, toggleInteractionMode, handleDownload, handleDeployClick, handleDeploySupabaseClick, handleUndo, handleRedo]);


    const renderMainContent = () => {
        if (!activeChat) return <MainContentWelcome />;
        if (!hasContent && isLoading) return <LiveGenerationView files={liveGenerationState.files} />;
        if (!hasContent) return <MainContentWelcome />;

        switch(view) {
            case 'split':
                return (
                    <div className="flex h-full">
                        <div className="w-1/2 h-full border-r border-gray-200"><CodeDisplay files={files} onFileContentChange={handleFileContentChange} historyIndex={activeChat.historyIndex} selectedElements={selectedElements} /></div>
                        <div className="w-1/2 h-full"><PreviewFrame files={files} device={device} interactionMode={interactionMode} selectedElementIds={selectedElements.map(el => el.id)} /></div>
                    </div>
                );
            case 'preview': return <PreviewFrame files={files} device={device} interactionMode={interactionMode} selectedElementIds={selectedElements.map(el => el.id)} />;
            case 'code': return <CodeDisplay files={files} onFileContentChange={handleFileContentChange} historyIndex={activeChat.historyIndex} selectedElements={selectedElements} />;
            case 'browser': return <MainContentWelcome />; // Browser mode is now text-only in the chat panel
            default: return null;
        }
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
            <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} commands={commands} />
            
            {modalState.type === 'rename' && modalState.data && (
                <Modal title="Rename Chat" onClose={() => modalDispatch({ type: 'CLOSE_MODAL' })}><form onSubmit={(e) => { e.preventDefault(); handleRenameChat(e.currentTarget.chatName.value); }}><input name="chatName" defaultValue={modalState.data.name} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" autoFocus /><div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => modalDispatch({ type: 'CLOSE_MODAL' })} className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200">Cancel</button><button type="submit" className="px-3 py-1 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white">Rename</button></div></form></Modal>
            )}
             {modalState.type === 'delete' && modalState.data && (
                <Modal title="Delete Chat" onClose={() => modalDispatch({ type: 'CLOSE_MODAL' })}><p>Are you sure you want to delete "{modalState.data.name}"? This action cannot be undone.</p><div className="flex justify-end gap-2 mt-4"><button onClick={() => modalDispatch({ type: 'CLOSE_MODAL' })} className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200">Cancel</button><button onClick={handleDeleteChat} className="px-3 py-1 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white">Delete</button></div></Modal>
            )}
            {modalState.type === 'deploy' && activeChat && (
                <DeployModal isOpen={modalState.type === 'deploy'} onClose={() => modalDispatch({ type: 'CLOSE_MODAL' })} onDeploy={handleDeployToGithub} projectName={activeChat.name} isDeploying={isDeploying} deployError={deployError} userRepos={userRepos} isFetchingRepos={isFetchingRepos} repoBranches={repoBranches} isFetchingBranches={isFetchingBranches} fetchBranchesForRepo={handleFetchBranches} />
            )}
            {modalState.type === 'supabase' && (
                <DeploySupabaseModal isOpen={modalState.type === 'supabase'} onClose={() => modalDispatch({ type: 'CLOSE_MODAL' })} onDeploy={handleDeployToSupabase} isDeploying={isDeployingToSupabase} deployError={supabaseDeployError} initialUrl={apiKeys.supabaseUrl || ''} initialKey={apiKeys.supabaseAnonKey || ''} />
            )}

            <AssistantPanel 
                messages={messages} onSendMessage={handleSendMessage} onStop={handleStopGeneration} isLoading={isLoading} uploadedImage={uploadedImage} setUploadedImage={setUploadedImage}
                selectedElements={selectedElements} setSelectedElements={setSelectedElements} models={modelsForSelector} selectedModel={selectedModel} setSelectedModel={setSelectedModel}
                apiKeys={apiKeys} onApiKeySave={setApiKeys} isImageUploadSupported={isImageUploadSupported} onToggleChatHistory={handleToggleChatHistory} isChatHistoryOpen={modalState.type === 'chatHistory'}
                chats={chats} activeChatId={activeChatId} onCreateChat={handleCreateChat} onSelectChat={handleSelectChat} onDeleteChat={handleOpenDeleteModal} onRenameChat={handleOpenRenameModal}
                useTailwind={useTailwind} onUseTailwindChange={setUseTailwind} systemPrompt={systemPrompt} onSystemPromptChange={setSystemPrompt}
                useGoogleSearch={useGoogleSearch} onUseGoogleSearchChange={setUseGoogleSearch} activeView={view}
            />

            <div className="flex-1 flex flex-col">
                <Header 
                    activeChatName={activeChat?.name || 'New Chat'} device={device} setDevice={setDevice} view={view} setView={setView} interactionMode={interactionMode} toggleInteractionMode={toggleInteractionMode}
                    onDownload={handleDownload} onDeployClick={handleDeployClick} onDeploySupabaseClick={handleDeploySupabaseClick} hasContent={hasContent}
                    onUndo={handleUndo} onRedo={handleRedo} canUndo={canUndo} canRedo={canRedo} onToggleBrowserView={handleToggleBrowserView}
                />
                <main className="flex-1 overflow-hidden bg-white">
                    {renderMainContent()}
                </main>
            </div>
        </div>
    );
};
