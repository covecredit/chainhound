import React, { useState } from 'react';
import { Heart, Copy, Check, X } from 'lucide-react';

interface DonationBannerProps {
  address: string;
  onClose: () => void;
}

const DonationBanner: React.FC<DonationBannerProps> = ({ address, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };
  
  return (
    <div className="bg-yellow-900/20 rounded-lg shadow-lg overflow-hidden border border-yellow-700/30 mb-6">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-900/30 p-2 rounded-full">
            <Heart className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Support ChainHound Development</h3>
            <p className="text-xs text-yellow-300/80 mt-0.5">
              If you find this tool useful, consider supporting our work with an Ethereum donation
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-yellow-400 hover:text-yellow-300"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-4 pb-4 flex items-center gap-2">
        <div className="flex-1 bg-gray-900 rounded-md px-3 py-2 font-mono text-sm text-gray-300 truncate">
          {address}
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 px-3 py-2 bg-yellow-700/50 text-yellow-200 rounded-md hover:bg-yellow-700/70 transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
};

export default DonationBanner;