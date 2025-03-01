import React from 'react';
import { Wallet, Cog, Box, ArrowRight, Cuboid as Cube } from 'lucide-react';

const TransactionLegend = () => {
  return (
    <div className="space-y-2 text-xs dark:text-gray-200">
      <h3 className="font-medium mb-1 text-sm">Node Types</h3>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-indigo-600 mr-1"></div>
        <Wallet className="h-3 w-3 mr-1" />
        <span>Address (EOA)</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-cyan-600 mr-1"></div>
        <Cog className="h-3 w-3 mr-1" />
        <span>Contract</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
        <Box className="h-3 w-3 mr-1" />
        <span>Transaction</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
        <Cube className="h-3 w-3 mr-1" />
        <span>Block</span>
      </div>
      
      <h3 className="font-medium mt-2 mb-1 text-sm">Address Roles</h3>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
        <span>From Address</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-emerald-500 mr-1"></div>
        <span>To Address</span>
      </div>
      
      <h3 className="font-medium mt-2 mb-1 text-sm">Transaction Types</h3>
      <div className="flex items-center">
        <div className="w-6 h-1 bg-red-500 mr-1"></div>
        <ArrowRight className="h-3 w-3 mr-1" />
        <span>Send</span>
      </div>
      <div className="flex items-center">
        <div className="w-6 h-1 bg-emerald-500 mr-1"></div>
        <ArrowRight className="h-3 w-3 mr-1" />
        <span>Receive</span>
      </div>
      <div className="flex items-center">
        <div className="w-6 h-1 bg-violet-500 mr-1"></div>
        <ArrowRight className="h-3 w-3 mr-1" />
        <span>Interact</span>
      </div>
    </div>
  );
};

export default TransactionLegend;