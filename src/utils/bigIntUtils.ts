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
export function safelyConvertStringToBigInt(value: string): number | string | bigint {
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
      // Otherwise keep as BigInt
      return BigInt(value);
    } catch (e) {
      // If conversion fails, return the original string
      return value;
    }
  }
  
  return value;
}

/**
 * Formats a BigInt or large number value to a human-readable string with units
 * @param value The value to format (BigInt, string, or number)
 * @param decimals Number of decimal places to show
 * @returns Formatted string
 */
export function formatBigValue(value: bigint | string | number, decimals: number = 2): string {
  let numValue: number;
  
  if (typeof value === 'bigint') {
    // Convert BigInt to string first
    const strValue = value.toString();
    // Then try to convert to number if it's not too large
    try {
      numValue = Number(strValue);
    } catch (e) {
      // If it's too large, just return the string with commas
      return strValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
  } else if (typeof value === 'string') {
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