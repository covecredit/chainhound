/**
 * Utility functions for handling BigInt conversions
 */

/**
 * Safely converts BigInt values in an object to strings to avoid serialization issues
 * @param obj Any object that might contain BigInt values
 * @returns The same object with BigInt values converted to strings
 */
export function safelyConvertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(item => safelyConvertBigIntToString(item));
    }
    
    const result: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = safelyConvertBigIntToString(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}

/**
 * Safely converts a string representation of a BigInt back to a number if possible
 * @param value String value that might represent a BigInt
 * @returns Number or the original string if conversion is not possible
 */
export function safelyConvertStringToNumber(value: string): number | string {
  if (!value || typeof value !== 'string') {
    return value;
  }
  
  // Check if it's a numeric string
  if (/^\d+$/.test(value)) {
    try {
      // If it's a small enough number, convert to Number
      const num = Number(value);
      if (!isNaN(num) && num <= Number.MAX_SAFE_INTEGER) {
        return num;
      }
      // Otherwise keep as string
      return value;
    } catch (e) {
      // If conversion fails, return the original string
      return value;
    }
  }
  
  return value;
}

/**
 * Formats a large number value to a human-readable string with units
 * @param value The value to format (string or number)
 * @param decimals Number of decimal places to show
 * @returns Formatted string
 */
export function formatLargeNumber(value: string | number, decimals: number = 2): string {
  let numValue: number;
  
  if (typeof value === 'string') {
    numValue = Number(value);
    if (isNaN(numValue)) {
      return value;
    }
  } else {
    numValue = value;
  }
  
  // Format with appropriate units
  if (numValue >= 1e12) {
    return (numValue / 1e12).toFixed(decimals) + 'T';
  } else if (numValue >= 1e9) {
    return (numValue / 1e9).toFixed(decimals) + 'B';
  } else if (numValue >= 1e6) {
    return (numValue / 1e6).toFixed(decimals) + 'M';
  } else if (numValue >= 1e3) {
    return (numValue / 1e3).toFixed(decimals) + 'K';
  } else {
    return numValue.toFixed(decimals);
  }
}

/**
 * Formats a wei value to ETH with appropriate precision
 * @param weiValue The wei value as a string
 * @returns Formatted ETH value
 */
export function formatWeiToEth(weiValue: string): string {
  try {
    // Convert wei to ETH (1 ETH = 10^18 wei)
    const wei = BigInt(weiValue);
    const eth = Number(wei) / 1e18;
    
    // Format with appropriate precision
    if (eth < 0.001) {
      return eth.toFixed(6);
    } else if (eth < 1) {
      return eth.toFixed(4);
    } else {
      return eth.toFixed(2);
    }
  } catch (e) {
    console.error('Error formatting wei to ETH:', e);
    return '0';
  }
}