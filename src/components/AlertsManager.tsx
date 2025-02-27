import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  Mail, 
  Eye, 
  Clock, 
  ToggleLeft, 
  ToggleRight,
  ExternalLink
} from 'lucide-react';
import { useAlerts } from '../hooks/useAlerts';
import { Alert, AlertConditionType, AlertFrequency } from '../types/alert';
import { useStorage } from '../hooks/useStorage';

interface AlertsManagerProps {
  address: string;
  providerUrl?: string;
}

const AlertsManager: React.FC<AlertsManagerProps> = ({
  address
}) => {
  const { 
    alerts, 
    notifications, 
    unreadCount,
    addAlert, 
    updateAlert, 
    deleteAlert,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications
  } = useAlerts();
  
  const { getEmailAddress, setEmailAddress } = useStorage();
  
  const [showCreateAlert, setShowCreateAlert] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'notifications'>('alerts');
  const [emailAddress, setEmailAddressState] = useState<string>('');
  const [emailValid, setEmailValid] = useState<boolean>(true);
  const [smtpServer, setSmtpServer] = useState<string>('');
  const [smtpPort, setSmtpPort] = useState<string>('587');
  const [smtpUsername, setSmtpUsername] = useState<string>('');
  const [smtpPassword, setSmtpPassword] = useState<string>('');
  const [showSmtpSettings, setShowSmtpSettings] = useState<boolean>(false);
  
  // New alert form state
  const [newAlert, setNewAlert] = useState<{
    name: string;
    description: string;
    conditionType: AlertConditionType;
    address: string;
    threshold: string;
    contractAddress: string;
    frequency: AlertFrequency;
    notifyInApp: boolean;
    notifyEmail: boolean;
  }>({
    name: '',
    description: '',
    conditionType: 'address_activity',
    address: address,
    threshold: '10',
    contractAddress: '',
    frequency: 'always',
    notifyInApp: true,
    notifyEmail: false
  });
  
  useEffect(() => {
    // Load saved email address
    const savedEmail = getEmailAddress();
    setEmailAddressState(savedEmail);
    
    // Mark notifications as read when tab is opened
    if (activeTab === 'notifications') {
      markAllNotificationsAsRead();
    }
  }, [activeTab]);
  
  const validateEmail = (email: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setEmailAddressState(email);
    setEmailValid(email === '' || validateEmail(email));
  };
  
  const saveEmail = () => {
    if (emailAddress === '' || validateEmail(emailAddress)) {
      setEmailAddress(emailAddress);
      setEmailValid(true);
      return true;
    } else {
      setEmailValid(false);
      return false;
    }
  };
  
  const handleCreateAlert = () => {
    // Validate form
    if (!newAlert.name) return;
    
    // Save email if provided
    if (newAlert.notifyEmail) {
      if (!saveEmail()) return;
    }
    
    // Create parameters based on condition type
    let parameters: any = {};
    
    switch (newAlert.conditionType) {
      case 'address_activity':
        parameters.address = newAlert.address;
        break;
      case 'large_transaction':
        parameters.threshold = newAlert.threshold;
        break;
      case 'contract_interaction':
        parameters.contractAddress = newAlert.contractAddress;
        break;
      case 'suspicious_address':
        // No parameters needed
        break;
    }
    
    // Create the alert
    addAlert({
      name: newAlert.name,
      description: newAlert.description,
      condition: {
        type: newAlert.conditionType,
        parameters
      },
      enabled: true,
      frequency: newAlert.frequency,
      notificationChannels: {
        inApp: newAlert.notifyInApp,
        email: newAlert.notifyEmail
      },
      emailAddress: newAlert.notifyEmail ? emailAddress : undefined
    });
    
    // Reset form and close modal
    setNewAlert({
      name: '',
      description: '',
      conditionType: 'address_activity',
      address: address,
      threshold: '10',
      contractAddress: '',
      frequency: 'always',
      notifyInApp: true,
      notifyEmail: false
    });
    
    setShowCreateAlert(false);
  };
  
  const toggleAlertEnabled = (alert: Alert) => {
    updateAlert({
      ...alert,
      enabled: !alert.enabled
    });
  };
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const getConditionDescription = (alert: Alert) => {
    const { condition } = alert;
    
    switch (condition.type) {
      case 'address_activity':
        return `Activity involving address ${condition.parameters.address}`;
      case 'large_transaction':
        return `Transactions larger than ${condition.parameters.threshold} ETH`;
      case 'contract_interaction':
        return `Interactions with contract ${condition.parameters.contractAddress}`;
      case 'suspicious_address':
        return 'Transactions involving known suspicious addresses';
      default:
        return 'Custom alert condition';
    }
  };
  
  const shortenAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`;
  };
  
  const shortenHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-red-500" />
            Blockchain Alerts
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          <button 
            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            onClick={() => setShowCreateAlert(true)}
          >
            <Plus className="h-4 w-4" />
            <span>New Alert</span>
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Set up alerts for suspicious blockchain activities
        </p>
      </div>
      
      <div className="border-b border-gray-700">
        <div className="flex">
          <button
            className={`px-4 py-3 font-medium text-sm flex-1 ${
              activeTab === 'alerts' 
                ? 'bg-gray-700 text-white border-b-2 border-red-500' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab('alerts')}
          >
            My Alerts
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm flex-1 ${
              activeTab === 'notifications' 
                ? 'bg-gray-700 text-white border-b-2 border-red-500' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            } flex items-center justify-center`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {activeTab === 'alerts' ? (
        <>
          {alerts.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">You don't have any alerts set up yet</p>
              <button
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                onClick={() => setShowCreateAlert(true)}
              >
                Create Your First Alert
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {alerts.map(alert => (
                <div key={alert.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium text-white">{alert.name}</h3>
                        <div 
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            alert.enabled ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {alert.enabled ? 'Active' : 'Disabled'}
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{alert.description}</p>
                    </div>
                    <button
                      onClick={() => toggleAlertEnabled(alert)}
                      className="text-gray-400 hover:text-white"
                    >
                      {alert.enabled ? (
                        <ToggleRight className="h-6 w-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-900 rounded-md p-3">
                      <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">Condition</h4>
                      <p className="text-sm text-gray-300">{getConditionDescription(alert)}</p>
                    </div>
                    
                    <div className="bg-gray-900 rounded-md p-3">
                      <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">Notifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {alert.notificationChannels.inApp && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                            <Bell className="h-3 w-3 text-red-500" />
                            <span>In-app</span>
                          </div>
                        )}
                        {alert.notificationChannels.email && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                            <Mail className="h-3 w-3 text-blue-500" />
                            <span>{alert.emailAddress || 'Email'}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                          <Clock className="h-3 w-3 text-yellow-500" />
                          <span>{alert.frequency === 'once' ? 'Once' : 'Always'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">Notification History</h3>
            {notifications.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={markAllNotificationsAsRead}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                >
                  <Check className="h-3 w-3" />
                  <span>Mark all as read</span>
                </button>
                <button
                  onClick={deleteAllNotifications}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear all</span>
                </button>
              </div>
            )}
          </div>
          
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No notifications yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Notifications will appear here when your alerts are triggered
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`p-4 ${notification.read ? 'bg-gray-800' : 'bg-gray-700'}`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white">
                          {notification.alertName}
                          {!notification.read && (
                            <span className="ml-2 bg-red-500 rounded-full w-2 h-2 inline-block"></span>
                          )}
                        </h3>
                        <div className="flex space-x-2">
                          {!notification.read && (
                            <button
                              onClick={() => markNotificationAsRead(notification.id)}
                              className="text-xs text-gray-400 hover:text-white"
                            >
                              Mark as read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-xs text-gray-400 hover:text-white"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-gray-300">{notification.message}</p>
                      <div className="mt-2 flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{formatTimestamp(notification.timestamp)}</span>
                        
                        {notification.transactionHash && (
                          <a
                            href={`https://etherscan.io/tx/${notification.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-3 flex items-center text-red-400 hover:text-red-300"
                          >
                            <span>{shortenHash(notification.transactionHash)}</span>
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {showCreateAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">Create New Alert</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Alert Name
                </label>
                <input
                  type="text"
                  value={newAlert.name}
                  onChange={(e) => setNewAlert({...newAlert, name: e.target.value})}
                  placeholder="e.g., Large Transaction Alert"
                  className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newAlert.description}
                  onChange={(e) => setNewAlert({...newAlert, description: e.target.value})}
                  placeholder="e.g., Alert me when large transactions occur"
                  className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Alert Condition
                </label>
                <select
                  value={newAlert.conditionType}
                  onChange={(e) => setNewAlert({...newAlert, conditionType: e.target.value as AlertConditionType})}
                  className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
                >
                  <option value="address_activity">Address Activity</option>
                  <option value="large_transaction">Large Transaction</option>
                  <option value="contract_interaction">Contract Interaction</option>
                  <option value="suspicious_address">Suspicious Address</option>
                </select>
              </div>
              
              {newAlert.conditionType === 'address_activity' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Address to Monitor
                  </label>
                  <input
                    type="text"
                    value={newAlert.address}
                    onChange={(e) => setNewAlert({...newAlert, address: e.target.value})}
                    placeholder="0x..."
                    className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              )}
              
              {newAlert.conditionType === 'large_transaction' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Threshold (ETH)
                  </label>
                  <input
                    type="number"
                    value={newAlert.threshold}
                    onChange={(e) => setNewAlert({...newAlert, threshold: e.target.value})}
                    min="0"
                    step="0.1"
                    className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              )}
              
              {newAlert.conditionType === 'contract_interaction' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Contract Address
                  </label>
                  <input
                    type="text"
                    value={newAlert.contractAddress}
                    onChange={(e) => setNewAlert({...newAlert, contractAddress: e.target.value})}
                    placeholder="0x..."
                    className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Alert Frequency
                </label>
                <div className="space-y-2">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-red-600"
                      checked={newAlert.frequency === 'always'}
                      onChange={() => setNewAlert({...newAlert, frequency: 'always'})}
                    />
                    <span className="ml-2 text-gray-300">Always (alert on every match)</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-red-600"
                      checked={newAlert.frequency === 'once'}
                      onChange={() => setNewAlert({...newAlert, frequency: 'once'})}
                    />
                    <span className="ml-2 text-gray-300">Once (alert only on first match)</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notification Methods
                </label>
                <div className="space-y-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox text-red-600"
                      checked={newAlert.notifyInApp}
                      onChange={(e) => setNewAlert({...newAlert, notifyInApp: e.target.checked})}
                    />
                    <span className="ml-2 text-gray-300">In-app notification</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox text-red-600"
                      checked={newAlert.notifyEmail}
                      onChange={(e) => setNewAlert({...newAlert, notifyEmail: e.target.checked})}
                    />
                    <span className="ml-2 text-gray-300">Email notification</span>
                  </label>
                </div>
              </div>
              
              {newAlert.notifyEmail && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={handleEmailChange}
                    placeholder="your@email.com"
                    className={`w-full rounded-md border ${emailValid ? 'border-gray-600' : 'border-red-500'} bg-gray-700 shadow-sm px-3 py-2 text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500`}
                  />
                  {!emailValid && (
                    <p className="mt-1 text-xs text-red-500">Please enter a valid email address</p>
                  )}
                  
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setShowSmtpSettings(!showSmtpSettings)}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                    >
                      {showSmtpSettings ? (
                        <>
                          <Eye className="h-3 w-3" />
                          <span>Hide SMTP Settings</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" />
                          <span>Show SMTP Settings</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {showSmtpSettings && (
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          SMTP Server
                        </label>
                        <input
                          type="text"
                          value={smtpServer}
                          onChange={(e) => setSmtpServer(e.target.value)}
                          placeholder="smtp.example.com"
                          className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-1 text-xs text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          SMTP Port
                        </label>
                        <input
                          type="text"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          placeholder="587"
                          className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-1 text-xs text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          SMTP Username
                        </label>
                        <input
                          type="text"
                          value={smtpUsername}
                          onChange={(e) => setSmtpUsername(e.target.value)}
                          placeholder="username"
                          className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-1 text-xs text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          SMTP Password
                        </label>
                        <input
                          type="password"
                          value={smtpPassword}
                          onChange={(e) => setSmtpPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-md border border-gray-600 bg-gray-700 shadow-sm px-3 py-1 text-xs text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateAlert(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAlert}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={!newAlert.name}
              >
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsManager;