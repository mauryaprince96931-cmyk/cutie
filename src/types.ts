
export interface ValidationError {
  statementId: string;
  optionId?: string;
  field: string;
  message: string;
  type?: 'error' | 'warning';
}

export interface User {
  id: string;
  name: string;
  email: string;
  passcode: string;
  role: 'user' | 'admin';
  data: {
    statements: Statement[];
    endings: Ending[];
    fallbackEnding?: { title: string; subtitle: string };
    entryMessage: EntryMessage;
  };
}

export interface Ending {
  id: string;
  title: string;
  subtitle: string;
}

export interface EntryMessage {
  title: string;
  subtitle: string;
}

export interface Option {
  id: string;
  text: string;
  nextId: string | null;
  isCorrect: boolean;
  wrongMessage: string;
  endingId?: string | null;
  ending?: { title: string; subtitle: string } | null;
  camoEnabled?: boolean;
  camoOption?: {
    text: string;
    isCorrect?: boolean;
    wrongMessage?: string;
    nextId?: string | null;
    endingId?: string | null;
  };
}

export interface Statement {
  id: string;
  text: string;
  options: Option[];
}