import { useState, useEffect } from 'react';
import { Notification } from '../components/NotificationPanel';

// Mock notification generator for demonstration
const generateMockNotifications = (): Notification[] => {
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'order_status',
      title: 'Order Status Updated',
      message: 'Order ORD-2024-001 has been marked as "In Transit" by the supplier.',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      isRead: false,
      priority: 'medium',
      relatedId: 'ORD-2024-001'
    },
    {
      id: '2',
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: 'High-Performance Processor (CPU-001) is running low. Current stock: 15 units (Min: 20)',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      isRead: false,
      priority: 'high',
      relatedId: 'CPU-001'
    },
    {
      id: '3',
      type: 'delivery',
      title: 'Delivery Completed',
      message: 'Order ORD-2024-002 has been successfully delivered and received.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      isRead: false,
      priority: 'medium',
      relatedId: 'ORD-2024-002'
    },
    {
      id: '4',
      type: 'price_change',
      title: 'Price Update Available',
      message: 'New pricing received from TechParts Inc. for Memory Module 32GB - 5% decrease.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      isRead: true,
      priority: 'low',
      relatedId: 'MEM-512'
    },
    {
      id: '5',
      type: 'approval',
      title: 'Order Requires Approval',
      message: 'Order ORD-2024-003 ($2,575.00) is pending management approval.',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      isRead: true,
      priority: 'medium',
      relatedId: 'ORD-2024-003'
    },
    {
      id: '6',
      type: 'system',
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur tonight from 2:00 AM - 4:00 AM AEST.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      isRead: true,
      priority: 'low'
    }
  ];

  return notifications;
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading notifications
    const timer = setTimeout(() => {
      setNotifications(generateMockNotifications());
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Simulate real-time notifications
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly add new notifications (10% chance every 30 seconds)
      if (Math.random() < 0.1) {
        const newNotification: Notification = {
          id: `notification-${Date.now()}`,
          type: ['order_status', 'low_stock', 'delivery', 'price_change'][Math.floor(Math.random() * 4)] as Notification['type'],
          title: 'New Update',
          message: 'A new update is available for your attention.',
          timestamp: new Date().toISOString(),
          isRead: false,
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as Notification['priority']
        };
        
        setNotifications(prev => [newNotification, ...prev]);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  };
};