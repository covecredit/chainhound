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
      return value.toString();
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
 * Safely converts a number to a BigInt string
 * @param value The number to convert
 * @returns A string representation of the number
 */
export function safelyConvertNumberToBigIntString(value: number): string {
  // Ensure we're working with a safe integer to avoid precision issues
  if (Number.isSafeInteger(value)) {
    return value.toString();
  }
  
  // For non-safe integers, use a string representation
  return value.toString();
}

/**
 * Formats a wei value to ETH with appropriate precision
 * @param weiValue The wei value as a string or BigInt
 * @returns Formatted ETH value
 */
export function formatWeiToEth(weiValue: string | bigint | number): string {
  try {
    if (weiValue === undefined || weiValue === null) {
      return '0';
    }
    
    // Handle different input types
    let weiString: string;
    
    if (typeof weiValue === 'bigint') {
      weiString = weiValue.toString();
    } else if (typeof weiValue === 'string') {
      // Remove '0x' prefix if present
      weiString = weiValue.startsWith('0x') ? 
        BigInt(weiValue).toString() : 
        weiValue.replace(/[^0-9]/g, ''); // Remove any non-numeric characters
    } else if (typeof weiValue === 'number') {
      weiString = weiValue.toString();
    } else {
      return '0';
    }
    
    // Handle zero value
    if (weiString === '0' || weiString === '') {
      return '0';
    }
    
    // Convert wei to ETH (1 ETH = 10^18 wei)
    // Use string operations to avoid precision issues with large numbers
    let ethValue: number;
    
    if (weiString.length <= 18) {
      // Less than 1 ETH
      const paddedWei = weiString.padStart(18, '0');
      const decimalPart = paddedWei.slice(0, paddedWei.length - 18) || '0';
      const fractionalPart = paddedWei.slice(paddedWei.length - 18);
      ethValue = Number(`${decimalPart}.${fractionalPart}`);
    } else {
      // More than 1 ETH - handle with string operations to avoid precision loss
      const integerPart = weiString.slice(0, weiString.length - 18);
      const fractionalPart = weiString.slice(weiString.length - 18).padStart(18, '0');
      
      // Take only the first few digits of the fractional part to avoid precision issues
      const significantFractionalPart = fractionalPart.substring(0, 6);
      ethValue = Number(`${integerPart}.${significantFractionalPart}`);
    }
    
    // Format with appropriate precision
    if (ethValue < 0.000001) {
      return '<0.000001';
    } else if (ethValue < 0.001) {
      return ethValue.toFixed(6);
    } else if (ethValue < 1) {
      return ethValue.toFixed(4);
    } else if (ethValue < 1000) {
      return ethValue.toFixed(2);
    } else {
      return ethValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
  } catch (e) {
    console.error('Error formatting wei to ETH:', e);
    return '0';
  }
}