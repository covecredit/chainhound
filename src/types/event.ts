export interface EventLog {
  address: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  eventName: string;
  parameters: Record<string, any>;
  timestamp?: number;
}