import React from 'react';
import { AlertTriangle, ExternalLink, Clock } from 'lucide-react';
import { AlertNotification as AlertNotificationType } from '../types/alert';

interface AlertNotificationProps {
  notification: AlertNotificationType;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const AlertNotification: React.FC<AlertNotificationProps> = ({
  notification,
  onMarkAsRead,
  onDelete
}) => {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const shortenHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  };
  
  return (
    <div className={`p-4 ${notification.read ? 'bg-gray-800' : 'bg-gray-700'} border-b border-gray-700`}>
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
                  onClick={() => onMarkAsRead(notification.id)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Mark as read
                </button>
              )}
              <button
                onClick={() => onDelete(notification.id)}
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
  );
};

export default AlertNotification;