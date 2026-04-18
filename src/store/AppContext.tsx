import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Statement, Ending, Option, EntryMessage } from '../types';

export type AppMode = 'login' | 'admin' | 'builder' | 'viewer' | 'test' | 'loading';

interface AppState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  currentStatementId: string | null;
  setCurrentStatementId: (id: string | null) => void;
  endingActive: boolean;
  setEndingActive: (active: boolean) => void;
  statements: Statement[] | null;
  setStatements: (statements: Statement[] | null | ((statements: Statement[] | null) => Statement[] | null)) => void;
  endings: Ending[] | null;
  setEndings: (endings: Ending[] | null) => void;
  ending: { title: string; subtitle: string };
  setEnding: (ending: { title: string; subtitle: string }) => void;
  entryMessage: EntryMessage | null;
  setEntryMessage: (msg: EntryMessage | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  dataLoaded: boolean;
  setDataLoaded: (loaded: boolean) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<AppMode>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentStatementId, setCurrentStatementId] = useState<string | null>(null);
  const [endingActive, setEndingActive] = useState(false);
  const [statements, setStatements] = useState<Statement[] | null>(null);
  const [endings, setEndings] = useState<Ending[] | null>(null);
  const [ending, setEnding] = useState<{ title: string; subtitle: string }>({
    title: "You chose love 💖",
    subtitle: "I knew you would… 🥺"
  });
  const [entryMessage, setEntryMessage] = useState<EntryMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        currentUser,
        setCurrentUser,
        isAdmin,
        setIsAdmin,
        currentStatementId,
        setCurrentStatementId,
        endingActive,
        setEndingActive,
        statements,
        setStatements,
        endings,
        setEndings,
        ending,
        setEnding,
        entryMessage,
        setEntryMessage,
        isLoading,
        setIsLoading,
        dataLoaded,
        setDataLoaded
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
