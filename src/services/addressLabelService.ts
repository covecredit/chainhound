import { AddressInfo } from '../types/address';

// Known addresses with predefined labels
const KNOWN_ADDRESSES: Record<string, { label: string, type: 'known' | 'suspicious', country?: string }> = {
  '0xfa09c3a328792253f8dee7116848723b72a6d2ea': { 
    label: 'Suspicious Actor', 
    type: 'suspicious',
    country: 'KP' // North Korea
  },
  '0x0fa09c3a328792253f8dee7116848723b72a6d2e': { 
    label: 'Bybit Hacker', 
    type: 'suspicious',
    country: 'KP' // North Korea
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
    type: 'suspicious',
    country: 'KP' // North Korea
  },
  '0x28c6c06298d514db089934071355e5743bf21d60': { 
    label: 'Binance Cold Wallet', 
    type: 'known' 
  },
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': { 
    label: 'Suspicious Actor', 
    type: 'suspicious',
    country: 'KP' // North Korea
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
  },
  // Add FBI/IC3 identified addresses
  '0x51E9d833Ecae4E8D9D8Be17300AEE6D3398C135D': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x96244D83DC15d36847C35209bBDc5bdDE9bEc3D8': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x83c7678492D623fb98834F0fbcb2E7b7f5Af8950': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x83Ef5E80faD88288F770152875Ab0bb16641a09E': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xAF620E6d32B1c67f3396EF5d2F7d7642Dc2e6CE9': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x3A21F4E6Bbe527D347ca7c157F4233c935779847': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xfa3FcCCB897079fD83bfBA690E7D47Eb402d6c49': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xFc926659Dd8808f6e3e0a8d61B20B871F3Fa6465': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xb172F7e99452446f18FF49A71bfEeCf0873003b4': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x6d46bd3AfF100f23C194e5312f93507978a6DC91': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xf0a16603289eAF35F64077Ba3681af41194a1c09': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x23Db729908137cb60852f2936D2b5c6De0e1c887': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x40e98FeEEbaD7Ddb0F0534Ccaa617427eA10187e': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x140c9Ab92347734641b1A7c124ffDeE58c20C3E3': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x684d4b58Dc32af786BF6D572A792fF7A883428B9': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xBC3e5e8C10897a81b63933348f53f2e052F89a7E': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x5Af75eAB6BEC227657fA3E749a8BFd55f02e4b1D': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xBCA02B395747D62626a65016F2e64A20bd254A39': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x4C198B3B5F3a4b1Aa706daC73D826c2B795ccd67': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xCd7eC020121Ead6f99855cbB972dF502dB5bC63a': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xbdE2Cc5375fa9E0383309A2cA31213f2D6cabcbd': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xD3C611AeD139107DEC2294032da3913BC26507fb': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xB72334cB9D0b614D30C4c60e2bd12fF5Ed03c305': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x8c7235e1A6EeF91b980D0FcA083347FBb7EE1806': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x1bb0970508316DC735329752a4581E0a4bAbc6B4': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x1eB27f136BFe7947f80d6ceE3Cf0bfDf92b45e57': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xCd1a4A457cA8b0931c3BF81Df3CFa227ADBdb6E9': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x09278b36863bE4cCd3d0c22d643E8062D7a11377': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x660BfcEa3A5FAF823e8f8bF57dd558db034dea1d': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xE9bc552fdFa54b30296d95F147e3e0280FF7f7e6': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x30a822CDD2782D2B2A12a08526452e885978FA1D': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xB4a862A81aBB2f952FcA4C6f5510962e18c7f1A2': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x0e8C1E2881F35Ef20343264862A242FB749d6b35': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x9271EDdda0F0f2bB7b1A0c712bdF8dbD0A38d1Ab': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xe69753Ddfbedbd249E703EB374452E78dae1ae49': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x2290937A4498C96eFfb87b8371a33D108F8D433f': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x959c4CA19c4532C97A657D82d97acCBAb70e6fb4': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x52207Ec7B1b43AA5DB116931a904371ae2C1619e': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x9eF42873Ae015AA3da0c4354AeF94a18D2B3407b': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x1542368a03ad1f03d96D51B414f4738961Cf4443': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x21032176B43d9f7E9410fB37290a78f4fEd6044C': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xA4B2Fd68593B6F34E51cB9eDB66E71c1B4Ab449e': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x55CCa2f5eB07907696afe4b9Db5102bcE5feB734': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xA5A023E052243b7cce34Cbd4ba20180e8Dea6Ad6': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xdD90071D52F20e85c89802e5Dc1eC0A7B6475f92': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x1512fcb09463A61862B73ec09B9b354aF1790268': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xF302572594a68aA8F951faE64ED3aE7DA41c72Be': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0x723a7084028421994d4a7829108D63aB44658315': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xf03AfB1c6A11A7E370920ad42e6eE735dBedF0b1': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xEB0bAA3A556586192590CAD296b1e48dF62a8549': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  '0xD5b58Cf7813c1eDC412367b97876bD400ea5c489': {
    label: 'Bybit Hack - FBI Identified',
    type: 'suspicious',
    country: 'KP'
  },
  // Contract addresses
  '0x96221423681a6d52e184d440a8efcebb105c7242': {
    label: 'Bybit Hack - Transfer Contract (ta)',
    type: 'suspicious',
    country: 'KP'
  },
  '0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516': {
    label: 'Bybit Hack - Destination Contract (da)',
    type: 'suspicious',
    country: 'KP'
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
  private getCustomLabels(): Record<string, { label: string, country?: string }> {
    const labels = localStorage.getItem(this.STORAGE_KEY);
    return labels ? JSON.parse(labels) : {};
  }
  
  // Save custom labels to local storage
  private saveCustomLabels(labels: Record<string, { label: string, country?: string }>): void {
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
        type: KNOWN_ADDRESSES[normalizedAddress].type,
        country: KNOWN_ADDRESSES[normalizedAddress].country
      };
    }
    
    // Check custom labels
    const customLabels = this.getCustomLabels();
    if (customLabels[normalizedAddress]) {
      return {
        address: normalizedAddress,
        label: customLabels[normalizedAddress].label,
        type: 'custom',
        country: customLabels[normalizedAddress].country
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
  async setAddressLabel(address: string, label: string, country?: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();
    const customLabels = this.getCustomLabels();
    
    customLabels[normalizedAddress] = { label, country };
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
        type: info.type,
        country: info.country
      });
    }
    
    // Add custom labels
    for (const [address, info] of Object.entries(customLabels)) {
      // Skip if already included as a known address
      if (!KNOWN_ADDRESSES[address]) {
        result.push({
          address,
          label: info.label,
          type: 'custom',
          country: info.country
        });
      }
    }
    
    return result;
  }
}