export type AlertConditionType = 
  | 'address_activity'
  | 'large_transaction'
  | 'contract_interaction'
  | 'suspicious_address'
  | 'specific_event';

export type AlertFrequency = 'once' | 'always';

export interface AlertCondition {
  type: AlertConditionType;
  parameters: {
    address?: string;
    threshold?: string;
    eventName?: string;
    contractAddress?: string;
    threatTag?: string;
    countryTag?: string;
  };
}

export interface Alert {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  enabled: boolean;
  createdAt: number;
  lastTriggered?: number;
  frequency: AlertFrequency;
  notificationChannels: {
    inApp: boolean;
    email: boolean;
  };
  emailAddress?: string;
  threatTag?: string;
  countryTag?: string;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  alertName: string;
  message: string;
  timestamp: number;
  read: boolean;
  transactionHash?: string;
  details?: any;
  threatTag?: string;
  countryTag?: string;
}