import React, { createContext, useContext, useState, ReactNode } from 'react';

/**
 * SECURITY NOTE
 * ────────────────────────────────────────────────────────────────────
 * Never hardcode your Anthropic API key here or anywhere in the client bundle.
 * The recommended approach is a server-side proxy (Supabase Edge Function).
 * Until then, the key is read from the EXPO_PUBLIC_ANTHROPIC_API_KEY env var,
 * which is acceptable for local/dev use but MUST be rotated before production.
 *
 * To use:
 *   1. Create a .env file at the project root
 *   2. Add:  EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
 *   3. Never commit .env to version control
 */
export const CLAUDE_API_KEY: string =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ANTHROPIC_API_KEY) ?? '';

interface AIContextType {
  isListening: boolean;
  setIsListening: (v: boolean) => void;
  aiModalVisible: boolean;
  setAiModalVisible: (v: boolean) => void;
  transcribedText: string;
  setTranscribedText: (t: string) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [isListening, setIsListening] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');

  return (
    <AIContext.Provider
      value={{
        isListening,
        setIsListening,
        aiModalVisible,
        setAiModalVisible,
        transcribedText,
        setTranscribedText,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error('useAI must be used within AIProvider');
  return ctx;
}
