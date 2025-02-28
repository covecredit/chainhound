import React from 'react';
import { Wallet, Cog, Box, ArrowRight } from 'lucide-react';

const TransactionLegend = () => {
  return (
    <div className="space-y-3 text-sm dark:text-gray-200">
      <h4 className="font-medium text-gray-700 dark:text-gray-300">Node Types</h4>
      <div className="flex items-center">
        <div className="w-4 h-4 rounded-full bg-indigo-600 mr-2"></div>
        <Wallet className="h-4 w-4 mr-1" />
        <span>Address (EOA)</span>
      </div>
      <div className="flex items-center">
        <div className="w-4 h-4 rounded-full bg-cyan-600 mr-2"></div>
        <Cog className="h-4 w-4 mr-1" />
        <span>Contract</span>
      </div>
      <div className="flex items-center">
        <div className="w-4 h-4 rounded-full bg-amber-500 mr-2"></div>
        <Box className="h-4 w-4 mr-1" />
        <span>Transaction</span>
      </div>
      
      <h4 className="font-medium text-gray-700 dark:text-gray-300 mt-4">Connection Types</h4>
      <div className="flex items-center">
        <div className="w-8 h-1 bg-red-500 mr-2"></div>
        <ArrowRight className="h-4 w-4 mr-1" />
        <span>Send</span>
      </div>
      <div className="flex items-center">
        <div className="w-8 h-1 bg-emerald-500 mr-2"></div>
        <ArrowRight className="h-4 w-4 mr-1" />
        <span>Receive</span>
      </div>
      <div className="flex items-center">
        <div className="w-8 h-1 bg-violet-500 mr-2"></div>
        <ArrowRight className="h-4 w-4 mr-1" />
        <span>Interact</span>
      </div>
    </div>
  );
};

export default TransactionLegend;