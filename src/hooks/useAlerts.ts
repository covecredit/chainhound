import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertNotification } from '../types/alert';
import { Transaction } from '../types/transaction';
import { useStorage } from './useStorage';
import toast from 'react-hot-toast';

export function useAlerts() {
  const { getFromStorage, setInStorage, STORAGE_KEYS, getEmailAddress } = useStorage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Load alerts and notifications from storage
  useEffect(() => {
    loadAlerts();
    loadNotifications();
  }, []);

  // Update unread count when notifications change
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const loadAlerts = () => {
    const storedAlerts = getFromStorage<Record<string, Alert>>(STORAGE_KEYS.ALERTS, {});
    setAlerts(Object.values(storedAlerts));
  };

  const loadNotifications = () => {
    const storedNotifications = getFromStorage<Record<string, AlertNotification>>(STORAGE_KEYS.NOTIFICATIONS, {});
    const notificationList = Object.values(storedNotifications).sort((a, b) => b.timestamp - a.timestamp);
    setNotifications(notificationList);
  };

  const saveAlerts = (updatedAlerts: Alert[]) => {
    const alertsMap = updatedAlerts.reduce((acc, alert) => {
      acc[alert.id] = alert;
      return acc;
    }, {} as Record<string, Alert>);
    
    setInStorage(STORAGE_KEYS.ALERTS, alertsMap);
    setAlerts(updatedAlerts);
  };

  const saveNotifications = (updatedNotifications: AlertNotification[]) => {
    const notificationsMap = updatedNotifications.reduce((acc, notification) => {
      acc[notification.id] = notification;
      return acc;
    }, {} as Record<string, AlertNotification>);
    
    setInStorage(STORAGE_KEYS.NOTIFICATIONS, notificationsMap);
    setNotifications(updatedNotifications);
  };

  const addAlert = (alert: Omit<Alert, 'id' | 'createdAt'>) => {
    const newAlert: Alert = {
      ...alert,
      id: uuidv4(),
      createdAt: Date.now(),
    };
    
    const updatedAlerts = [...alerts, newAlert];
    saveAlerts(updatedAlerts);
    return newAlert;
  };

  const updateAlert = (updatedAlert: Alert) => {
    const updatedAlerts = alerts.map(alert => 
      alert.id === updatedAlert.id ? updatedAlert : alert
    );
    saveAlerts(updatedAlerts);
  };

  const deleteAlert = (alertId: string) => {
    const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
    saveAlerts(updatedAlerts);
    
    // Also delete related notifications
    const updatedNotifications = notifications.filter(notification => notification.alertId !== alertId);
    saveNotifications(updatedNotifications);
  };

  const markNotificationAsRead = (notificationId: string) => {
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true } 
        : notification
    );
    saveNotifications(updatedNotifications);
  };

  const markAllNotificationsAsRead = () => {
    const updatedNotifications = notifications.map(notification => ({ ...notification, read: true }));
    saveNotifications(updatedNotifications);
  };

  const deleteNotification = (notificationId: string) => {
    const updatedNotifications = notifications.filter(notification => notification.id !== notificationId);
    saveNotifications(updatedNotifications);
  };

  const deleteAllNotifications = () => {
    saveNotifications([]);
  };

  const createNotification = (alertId: string, message: string, details?: any) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;
    
    const notification: AlertNotification = {
      id: uuidv4(),
      alertId,
      alertName: alert.name,
      message,
      timestamp: Date.now(),
      read: false,
      transactionHash: details?.hash,
      details,
      threatTag: alert.threatTag,
      countryTag: alert.countryTag
    };
    
    const updatedNotifications = [notification, ...notifications];
    saveNotifications(updatedNotifications);
    
    // Show toast notification without JSX
    toast.custom((t) => {
      // Create a DOM element for the toast
      const toastElement = document.createElement('div');
      toastElement.className = 'flex items-start';
      
      // Create content container
      const contentDiv = document.createElement('div');
      contentDiv.className = 'flex-1';
      
      // Create title
      const titleP = document.createElement('p');
      titleP.className = 'font-medium';
      titleP.textContent = alert.name;
      
      // Create message
      const messageP = document.createElement('p');
      messageP.className = 'text-sm text-gray-300';
      messageP.textContent = message;
      
      // Create close button
      const closeButton = document.createElement('button');
      closeButton.className = 'ml-4 text-gray-400 hover:text-white';
      closeButton.textContent = '×';
      closeButton.onclick = () => toast.dismiss(t.id);
      
      // Assemble the elements
      contentDiv.appendChild(titleP);
      contentDiv.appendChild(messageP);
      toastElement.appendChild(contentDiv);
      toastElement.appendChild(closeButton);
      
      return toastElement;
    });
    
    // Send email notification if configured
    if (alert.notificationChannels.email && alert.emailAddress) {
      sendEmailNotification(alert.emailAddress, alert.name, message, details);
    }
    
    return notification;
  };

  const sendEmailNotification = (email: string, title: string, message: string, details?: any) => {
    // In a real application, this would call a backend API to send an email
    console.log(`Sending email notification to ${email}:`, { title, message, details });
    
    // For demo purposes, we'll simulate email sending with a toast
    toast.custom((t) => {
      // Create a DOM element for the toast
      const toastElement = document.createElement('div');
      toastElement.className = 'flex items-start';
      
      // Create content container
      const contentDiv = document.createElement('div');
      contentDiv.className = 'flex-1';
      
      // Create title
      const titleP = document.createElement('p');
      titleP.className = 'font-medium';
      titleP.textContent = 'Email Notification Sent';
      
      // Create recipient
      const recipientP = document.createElement('p');
      recipientP.className = 'text-sm text-gray-300';
      recipientP.textContent = `To: ${email}`;
      
      // Create alert name
      const alertP = document.createElement('p');
      alertP.className = 'text-sm text-gray-300';
      alertP.textContent = `Alert: ${title}`;
      
      // Create close button
      const closeButton = document.createElement('button');
      closeButton.className = 'ml-4 text-gray-400 hover:text-white';
      closeButton.textContent = '×';
      closeButton.onclick = () => toast.dismiss(t.id);
      
      // Assemble the elements
      contentDiv.appendChild(titleP);
      contentDiv.appendChild(recipientP);
      contentDiv.appendChild(alertP);
      toastElement.appendChild(contentDiv);
      toastElement.appendChild(closeButton);
      
      return toastElement;
    });
  };

  const checkAlertCondition = (alert: Alert, transaction: Transaction): boolean => {
    const { condition } = alert;
    
    switch (condition.type) {
      case 'address_activity':
        // Check if transaction involves the specified address
        const address = condition.parameters.address?.toLowerCase();
        return address ? 
          transaction.from.toLowerCase() === address || 
          transaction.to.toLowerCase() === address : false;
        
      case 'large_transaction':
        // Check if transaction value exceeds threshold
        const threshold = condition.parameters.threshold;
        if (!threshold) return false;
        const thresholdValue = parseFloat(threshold);
        const txValue = parseFloat(transaction.value) / 1e18; // Convert wei to ETH
        return txValue >= thresholdValue;
        
      case 'contract_interaction':
        // Check if transaction involves the specified contract
        const contractAddress = condition.parameters.contractAddress?.toLowerCase();
        return contractAddress ? transaction.to.toLowerCase() === contractAddress : false;
        
      case 'suspicious_address':
        // Check if transaction involves any suspicious address
        // In a real app, you'd check against a database of suspicious addresses
        const suspiciousAddresses = [
          '0xfa09c3a328792253f8dee7116848723b72a6d2ea',
          '0x0fa09c3a328792253f8dee7116848723b72a6d2e', // Bybit hacker address
          '0xdfd5293d8e347dfe59e90efd55b2956a1343963d',
          '0x21a31ee1afc51d94c2efccaa2092ad1028285549'
        ];
        return suspiciousAddresses.some(addr => 
          transaction.from.toLowerCase() === addr.toLowerCase() || 
          transaction.to.toLowerCase() === addr.toLowerCase()
        );
        
      default:
        return false;
    }
  };

  const checkForAlerts = (transactions: Transaction[]) => {
    const enabledAlerts = alerts.filter(alert => alert.enabled);
    if (enabledAlerts.length === 0 || transactions.length === 0) return;
    
    for (const alert of enabledAlerts) {
      // Skip if this is a 'once' alert that has already been triggered
      if (alert.frequency === 'once' && alert.lastTriggered) continue;
      
      for (const transaction of transactions) {
        if (checkAlertCondition(alert, transaction)) {
          // Create notification message based on alert type
          let message = '';
          switch (alert.condition.type) {
            case 'address_activity':
              message = `Activity detected for address ${alert.condition.parameters.address}`;
              break;
            case 'large_transaction':
              message = `Large transaction of ${parseFloat(transaction.value) / 1e18} ETH detected`;
              break;
            case 'contract_interaction':
              message = `Interaction with contract ${alert.condition.parameters.contractAddress} detected`;
              break;
            case 'suspicious_address':
              message = `Transaction involving suspicious address detected`;
              break;
            default:
              message = `Alert triggered: ${alert.name}`;
          }
          
          // Create notification
          createNotification(alert.id, message, transaction);
          
          // Update alert's lastTriggered timestamp
          updateAlert({
            ...alert,
            lastTriggered: Date.now()
          });
          
          // For 'once' alerts, we can break after the first match
          if (alert.frequency === 'once') break;
        }
      }
    }
  };

  return {
    alerts,
    notifications,
    unreadCount,
    addAlert,
    updateAlert,
    deleteAlert,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications,
    checkForAlerts
  };
}