import React, { useState, useEffect } from 'react';
import { Tag, Edit, Check, X, ExternalLink } from 'lucide-react';
import { AddressLabelService } from '../services/addressLabelService';

interface AddressLabelProps {
  address: string;
  showEdit?: boolean;
}

const AddressLabel: React.FC<AddressLabelProps> = ({ 
  address,
  showEdit = true
}) => {
  const [label, setLabel] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>('');
  const [labelType, setLabelType] = useState<'known' | 'suspicious' | 'custom' | 'none'>('none');
  
  const labelService = new AddressLabelService();
  
  useEffect(() => {
    loadLabel();
  }, [address]);
  
  const loadLabel = async () => {
    const addressInfo = await labelService.getAddressLabel(address);
    setLabel(addressInfo.label);
    setLabelType(addressInfo.type);
  };
  
  const startEditing = () => {
    setIsEditing(true);
    setEditValue(label || '');
  };
  
  const cancelEditing = () => {
    setIsEditing(false);
  };
  
  const saveLabel = async () => {
    await labelService.setAddressLabel(address, editValue);
    setLabel(editValue);
    setLabelType('custom');
    setIsEditing(false);
  };
  
  const shortenAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
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
          <a 
            href={`https://etherscan.io/address/${address}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline text-gray-300 mr-1"
          >
            {shortenAddress(address)}
          </a>
          
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