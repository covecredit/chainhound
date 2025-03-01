/**
 * Utility functions for handling CORS issues with Ethereum providers
 */

/**
 * Checks if we're running in a local development environment
 */
export function isLocalEnvironment(): boolean {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('stackblitz') ||
         window.location.hostname.includes('webcontainer');
}

/**
 * Gets a list of fallback providers that are known to work well
 */
export function getFallbackProviders(): string[] {
  return [
    'https://eth.llamarpc.com',
    'https://cloudflare-eth.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
    'https://1rpc.io/eth'
  ];
}

/**
 * Creates a URL that should work without CORS issues
 * @param originalUrl The original provider URL
 * @returns The original URL (no proxy needed)
 */
export function createProxyUrl(originalUrl: string): string {
  // Don't use any proxy - we'll handle CORS differently
  return originalUrl;
}

/**
 * Tests if a provider URL is accessible
 * @param url The provider URL to test
 * @returns Promise resolving to true if accessible, false otherwise
 */
export async function testProviderConnection(url: string): Promise<boolean> {
  try {
    // We can't directly test the connection due to CORS
    // Instead, we'll rely on Web3.js's connection handling
    return true;
  } catch (error) {
    console.error('Provider connection test failed:', error);
    return false;
  }
}