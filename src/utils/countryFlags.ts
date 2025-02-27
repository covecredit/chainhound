import { GB, US, CN, RU, KP, IR, JP, DE, FR, CA, AU, IN, BR, SG, CH } from 'country-flag-icons/react/3x2';
import React from 'react';

// Map of country codes to flag components
const flagComponents: Record<string, React.ComponentType<any>> = {
  GB, US, CN, RU, KP, IR, JP, DE, FR, CA, AU, IN, BR, SG, CH
};

// Get country flag emoji
export const getCountryFlag = (countryCode: string): string => {
  // Convert country code to regional indicator symbols
  // Each country code letter is converted to a regional indicator symbol
  // by adding an offset to its Unicode code point
  if (!countryCode || countryCode.length !== 2) return '';
  
  const codePoints = [...countryCode.toUpperCase()].map(
    char => char.charCodeAt(0) + 127397 // 127397 is the offset to convert ASCII to regional indicator symbols
  );
  
  return String.fromCodePoint(...codePoints);
};

// Get country flag component
export const getCountryFlagComponent = (countryCode: string): React.ReactNode => {
  const FlagComponent = flagComponents[countryCode];
  if (FlagComponent) {
    return React.createElement(FlagComponent, { className: "h-4 w-4" });
  }
  return null;
};

// Get country name from code
export const getCountryName = (countryCode: string): string => {
  const countryNames: Record<string, string> = {
    GB: 'United Kingdom',
    US: 'United States',
    CN: 'China',
    RU: 'Russia',
    KP: 'North Korea',
    IR: 'Iran',
    JP: 'Japan',
    DE: 'Germany',
    FR: 'France',
    CA: 'Canada',
    AU: 'Australia',
    IN: 'India',
    BR: 'Brazil',
    SG: 'Singapore',
    CH: 'Switzerland'
  };
  
  return countryNames[countryCode] || countryCode;
};