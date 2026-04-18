
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  data: {
    statements: Statement[];
    endings: Ending[];
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
}

export interface Statement {
  id: string;
  text: string;
  options: Option[];
}