export interface AddressInfo {
  address: string;
  label: string | null;
  type: 'known' | 'suspicious' | 'custom' | 'none';
}