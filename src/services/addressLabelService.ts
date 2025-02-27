import { AddressInfo } from '../types/address';

// Known addresses with predefined labels
const KNOWN_ADDRESSES: Record<string, { label: string, type: 'known' | 'suspicious' }> = {
  '0xfa09c3a328792253f8dee7116848723b72a6d2ea': { 
    label: 'Suspicious Actor', 
    type: 'suspicious' 
  },
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { 
    label: 'WETH Contract', 
    type: 'known' 
  },
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': { 
    label: 'Uniswap V2 Router', 
    type: 'known' 
  },
  '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be': { 
    label: 'Binance Hot Wallet', 
    type: 'known' 
  },
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': { 
    label: 'Suspicious Actor', 
    type: 'suspicious' 
  },
  '0x28c6c06298d514db089934071355e5743bf21d60': { 
    label: 'Binance Cold Wallet', 
    type: 'known' 
  },
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': { 
    label: 'Suspicious Actor', 
    type: 'suspicious' 
  },
  '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8': { 
    label: 'Binance Cold Wallet 2', 
    type: 'known' 
  },
  '0xda9dfa130df4de4673b89022ee50ff26f6ea73cf': { 
    label: 'Kraken Hot Wallet', 
    type: 'known' 
  },
  '0xa910f92acdaf488fa6ef02174fb86208ad7722ba': { 
    label: 'Aave Treasury', 
    type: 'known' 
  }
};

export class AddressLabelService {
  private readonly STORAGE_KEY = 'blockchain-explorer-address-labels';
  
  constructor() {
    // Initialize storage if needed
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({}));
    }
  }
  
  // Get custom labels from local storage
  private getCustomLabels(): Record<string, string> {
    const labels = localStorage.getItem(this.STORAGE_KEY);
    return labels ? JSON.parse(labels) : {};
  }
  
  // Save custom labels to local storage
  private saveCustomLabels(labels: Record<string, string>): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(labels));
  }
  
  // Get label for a specific address
  async getAddressLabel(address: string): Promise<AddressInfo> {
    const normalizedAddress = address.toLowerCase();
    
    // Check if it's a known address
    if (KNOWN_ADDRESSES[normalizedAddress]) {
      return {
        address: normalizedAddress,
        label: KNOWN_ADDRESSES[normalizedAddress].label,
        type: KNOWN_ADDRESSES[normalizedAddress].type
      };
    }
    
    // Check custom labels
    const customLabels = this.getCustomLabels();
    if (customLabels[normalizedAddress]) {
      return {
        address: normalizedAddress,
        label: customLabels[normalizedAddress],
        type: 'custom'
      };
    }
    
    // No label found
    return {
      address: normalizedAddress,
      label: null,
      type: 'none'
    };
  }
  
  // Set a custom label for an address
  async setAddressLabel(address: string, label: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();
    const customLabels = this.getCustomLabels();
    
    customLabels[normalizedAddress] = label;
    this.saveCustomLabels(customLabels);
  }
  
  // Remove a custom label
  async removeAddressLabel(address: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();
    const customLabels = this.getCustomLabels();
    
    if (customLabels[normalizedAddress]) {
      delete customLabels[normalizedAddress];
      this.saveCustomLabels(customLabels);
    }
  }
  
  // Get all address labels (both known and custom)
  async getAllAddressLabels(): Promise<AddressInfo[]> {
    const customLabels = this.getCustomLabels();
    const result: AddressInfo[] = [];
    
    // Add known addresses
    for (const [address, info] of Object.entries(KNOWN_ADDRESSES)) {
      result.push({
        address,
        label: info.label,
        type: info.type
      });
    }
    
    // Add custom labels
    for (const [address, label] of Object.entries(customLabels)) {
      // Skip if already included as a known address
      if (!KNOWN_ADDRESSES[address]) {
        result.push({
          address,
          label,
          type: 'custom'
        });
      }
    }
    
    return result;
  }
}