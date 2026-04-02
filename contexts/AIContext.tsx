import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AIContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  isListening: boolean;
  setIsListening: (v: boolean) => void;
  aiModalVisible: boolean;
  setAiModalVisible: (v: boolean) => void;
  transcribedText: string;
  setTranscribedText: (t: string) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');

  return (
    <AIContext.Provider
      value={{
        apiKey,
        setApiKey,
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
