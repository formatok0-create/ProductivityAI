import React, { createContext, useContext, useState, ReactNode } from 'react';

// OnSpace AI est utilisé — aucune clé API externe requise.
// Les credentials sont injectés automatiquement par la plateforme.

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
