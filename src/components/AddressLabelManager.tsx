import React, { useState, useEffect } from 'react';
import { Tag, Trash2, Plus, Search, AlertTriangle, Flag } from 'lucide-react';
import { AddressLabelService } from '../services/addressLabelService';
import { AddressInfo } from '../types/address';
import AddressLabel from './AddressLabel';
import { getCountryFlag, getCountryName } from '../utils/countryFlags';

const AddressLabelManager: React.FC = () => {
  const [addressLabels, setAddressLabels] = useState<AddressInfo[]>([]);
  const [newAddress, setNewAddress] = useState<string>('');
  const [newLabel, setNewLabel] = useState<string>('');
  const [newCountry, setNewCountry] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>('all');
  
  const labelService = new AddressLabelService();
  
  useEffect(() => {
    loadAddressLabels();
  }, []);
  
  const loadAddressLabels = async () => {
    const labels = await labelService.getAllAddressLabels();
    setAddressLabels(labels);
  };
  
  const addNewLabel = async () => {
    if (!newAddress || !newLabel) {
      setError('Both address and label are required');
      return;
    }
    
    if (!newAddress.startsWith('0x') || newAddress.length !== 42) {
      setError('Invalid Ethereum address format');
      return;
    }
    
    try {
      await labelService.setAddressLabel(newAddress, newLabel, newCountry || undefined);
      setNewAddress('');
      setNewLabel('');
      setNewCountry('');
      setError(null);
      loadAddressLabels();
    } catch (err) {
      setError('Failed to add label');
    }
  };
  
  const deleteLabel = async (address: string) => {
    await labelService.removeAddressLabel(address);
    loadAddressLabels();
  };
  
  const filteredLabels = addressLabels.filter(item => 
    (item.address.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.label && item.label.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    (countryFilter === 'all' || (item.country === countryFilter))
  );
  
  // Get unique countries from address labels
  const countries = Array.from(new Set(addressLabels.filter(item => item.country).map(item => item.country as string)));
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Tag className="h-5 w-5 text-red-500" />
          Address Label Manager
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Manage labels for blockchain addresses
        </p>
      </div>
      
      <div className="p-4 border-b border-gray-700 bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-grow">
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Ethereum address (0x...)"
                  className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="flex-grow">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label (e.g., 'Binance Hot Wallet')"
                  className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="flex-grow">
                <select
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
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
              </div>
              <div>
                <button
                  onClick={addNewLabel}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  <Plus className="h-4 w-4 inline mr-1" />
                  Add Label
                </button>
              </div>
            </div>
            
            {error && (
              <div className="mt-2 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                {error}
              </div>
            )}
          </div>
          
          <div className="md:col-span-2 mt-2">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search addresses or labels..."
                className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
              </div>
            </div>
          </div>
          
          <div className="md:col-span-1 mt-2">
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All Countries</option>
              {countries.map(code => (
                <option key={code} value={code}>
                  {getCountryFlag(code)} {getCountryName(code)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Address
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Label
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Country
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {filteredLabels.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-400">
                  {searchTerm ? 'No matching addresses found' : 'No labeled addresses yet'}
                </td>
              </tr>
            ) : (
              filteredLabels.map((item) => (
                <tr key={item.address} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    <AddressLabel address={item.address} showEdit={false} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${item.type === 'known' ? 'bg-blue-900/50 text-blue-300' : 
                        item.type === 'suspicious' ? 'bg-red-900/50 text-red-300' : 
                        item.type === 'custom' ? 'bg-purple-900/50 text-purple-300' : 
                        'bg-gray-700 text-gray-300'}`}
                    >
                      {item.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {item.country ? (
                      <span className="flex items-center gap-1">
                        <span className="text-lg">{getCountryFlag(item.country)}</span>
                        <span>{getCountryName(item.country)}</span>
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 capitalize">
                    {item.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {item.type === 'custom' && (
                      <button
                        onClick={() => deleteLabel(item.address)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete label"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {(item.type === 'known' || item.type === 'suspicious') && (
                      <span className="text-xs text-gray-500">System label</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AddressLabelManager;