export interface Note {
  id: string;
  content: string;
  timestamp: number;
  createdBy?: string;
}

export interface Case {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  addresses: string[];
  contracts: string[];
  transactions: string[];
  notes: Note[];
  tags: string[];
}