export const GEMINI_FLASH_MODEL = "gemini-2.5-flash";
export const GEMINI_PRO_MODEL = "gemini-2.5-pro";

export const ALL_FREE_MODELS = {
    groq: [
        { id: 'groq/llama3-70b-8192', name: 'Groq Llama 3 70B' },
        { id: 'groq/llama3.1-8b-instant', name: 'Groq Llama 3.1 8B' },
    ],
    image: [
        { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
        { id: 'microsoft/phi-3-vision-128k-instruct', name: 'Phi-3 Vision' },
        { id: 'huggingfaceh4/idefics2-8b-instruct', name: 'HuggingFace IDEFICS2 8B' },
    ],
    tool: [
        { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B' },
        { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
    ],
    complex_text: [
        { id: 'openai/gpt-oss-120b', name: 'OpenAI GPT-OSS 120B' },
        { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B' },
        { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B' },
    ],
    simple_text: [
        { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B' },
        { id: 'openai/gpt-oss-20b', name: 'OpenAI GPT-OSS 20B' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
        { id: 'allam-2-7b', name: 'Allam v2 7B' },
    ]
};