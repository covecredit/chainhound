import React, { useState, useEffect } from 'react';
import { Tag, Edit, Check, X, ExternalLink, Flag } from 'lucide-react';
import { AddressLabelService } from '../services/addressLabelService';
import { getCountryFlag, getCountryName } from '../utils/countryFlags';

interface AddressLabelProps {
  address: string;
  showEdit?: boolean;
  showFull?: boolean;
}

const AddressLabel: React.FC<AddressLabelProps> = ({ 
  address,
  showEdit = true,
  showFull = false
}) => {
  const [label, setLabel] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>('');
  const [labelType, setLabelType] = useState<'known' | 'suspicious' | 'custom' | 'none'>('none');
  const [country, setCountry] = useState<string | undefined>(undefined);
  const [editCountry, setEditCountry] = useState<string>('');
  
  const labelService = new AddressLabelService();
  
  useEffect(() => {
    loadLabel();
  }, [address]);
  
  const loadLabel = async () => {
    const addressInfo = await labelService.getAddressLabel(address);
    setLabel(addressInfo.label);
    setLabelType(addressInfo.type);
    setCountry(addressInfo.country);
  };
  
  const startEditing = () => {
    setIsEditing(true);
    setEditValue(label || '');
    setEditCountry(country || '');
  };
  
  const cancelEditing = () => {
    setIsEditing(false);
  };
  
  const saveLabel = async () => {
    await labelService.setAddressLabel(address, editValue, editCountry || undefined);
    setLabel(editValue);
    setLabelType('custom');
    setCountry(editCountry || undefined);
    setIsEditing(false);
  };
  
  const handleAddressClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Open in a new tab
    window.open(`/?address=${address}`, '_blank');
  };
  
  const getLabelColor = () => {
    switch (labelType) {
      case 'known':
        return 'bg-blue-900/50 text-blue-300';
      case 'suspicious':
        return 'bg-red-900/50 text-red-300';
      case 'custom':
        return 'bg-purple-900/50 text-purple-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };
  
  return (
    <span className="inline-flex items-center">
      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-600 bg-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-1 focus:ring-red-500"
            placeholder="Enter label"
            autoFocus
          />
          <select
            value={editCountry}
            onChange={(e) => setEditCountry(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-600 bg-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="">No country</option>
            <option value="US">🇺🇸 USA</option>
            <option value="CN">🇨🇳 China</option>
            <option value="RU">🇷🇺 Russia</option>
            <option value="KP">🇰🇵 North Korea</option>
            <option value="IR">🇮🇷 Iran</option>
            <option value="GB">🇬🇧 UK</option>
            <option value="JP">🇯🇵 Japan</option>
            <option value="DE">🇩🇪 Germany</option>
            <option value="FR">🇫🇷 France</option>
            <option value="CA">🇨🇦 Canada</option>
            <option value="AU">🇦🇺 Australia</option>
            <option value="IN">🇮🇳 India</option>
            <option value="BR">🇧🇷 Brazil</option>
            <option value="SG">🇸🇬 Singapore</option>
            <option value="CH">🇨🇭 Switzerland</option>
          </select>
          <button 
            onClick={saveLabel}
            className="p-1 text-green-400 hover:bg-green-900/30 rounded-full"
          >
            <Check className="h-3 w-3" />
          </button>
          <button 
            onClick={cancelEditing}
            className="p-1 text-red-400 hover:bg-red-900/30 rounded-full"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <>
          <span 
            className="hover:underline text-gray-300 mr-1 font-mono cursor-pointer"
            onClick={handleAddressClick}
          >
            {showFull ? address : address}
          </span>
          
          {country && (
            <span className="mr-1" title={`Country: ${getCountryName(country)}`}>
              {getCountryFlag(country)}
            </span>
          )}
          
          {label && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLabelColor()} ml-1`}>
              <Tag className="h-3 w-3 mr-1" />
              {label}
            </span>
          )}
          
          {showEdit && (
            <button 
              onClick={startEditing}
              className="ml-1 p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded-full"
              title="Edit label"
            >
              <Edit className="h-3 w-3" />
            </button>
          )}
        </>
      )}
    </span>
  );
};

export default AddressLabel;