import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Notification } from '../types';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications from Supabase
  const fetchNotifications = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await Promise.race([
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Notifications fetch timeout after 30 seconds')), 30000)
        )
      ]) as [any, never];

      if (fetchError) throw fetchError;

      // Transform Supabase data to match Notification interface
      const transformedNotifications: Notification[] = (data || []).map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: notification.created_at,
        isRead: notification.is_read,
        priority: notification.priority,
        relatedId: notification.related_id,
        actionUrl: notification.action_url
      }));

      setNotifications(transformedNotifications);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription and fetch initial data
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    // Fetch initial notifications with timeout
    const fetchWithTimeout = async () => {
      try {
        await Promise.race([
          fetchNotifications(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Notifications fetch timeout')), 15000)
          )
        ]);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setError('Failed to load notifications');
        setIsLoading(false);
      }
    };
    
    fetchWithTimeout();

    // Set up real-time subscription with error handling
    let channel: any = null;
    
    try {
      channel = supabase
        .channel(`notifications_for_user_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Real-time notification update:', payload);
            
            try {
              // Validate payload structure before processing
              if (!payload || !payload.eventType) {
                console.warn('Invalid payload received:', payload);
                return;
              }

              switch (payload.eventType) {
                case 'INSERT':
                  if (!payload.new || !payload.new.id) {
                    console.warn('Invalid INSERT payload:', payload);
                    return;
                  }
                  // Add new notification to the beginning of the list
                  const newNotification: Notification = {
                    id: payload.new.id,
                    type: payload.new.type,
                    title: payload.new.title,
                    message: payload.new.message,
                    timestamp: payload.new.created_at,
                    isRead: payload.new.is_read,
                    priority: payload.new.priority,
                    relatedId: payload.new.related_id,
                    actionUrl: payload.new.action_url
                  };
                  setNotifications(prev => [newNotification, ...prev]);
                  break;
                  
                case 'UPDATE':
                  if (!payload.new || !payload.new.id) {
                    console.warn('Invalid UPDATE payload:', payload);
                    return;
                  }
                  // Update existing notification
                  setNotifications(prev => prev.map(notification =>
                    notification.id === payload.new.id
                      ? {
                          ...notification,
                          type: payload.new.type,
                          title: payload.new.title,
                          message: payload.new.message,
                          timestamp: payload.new.created_at,
                          isRead: payload.new.is_read,
                          priority: payload.new.priority,
                          relatedId: payload.new.related_id,
                          actionUrl: payload.new.action_url
                        }
                      : notification
                  ));
                  break;
                  
                case 'DELETE':
                  if (!payload.old || !payload.old.id) {
                    console.warn('Invalid DELETE payload:', payload);
                    return;
                  }
                  // Remove deleted notification
                  setNotifications(prev => prev.filter(notification => 
                    notification.id !== payload.old.id
                  ));
                  break;
                 
                 default:
                   console.warn('Unknown event type:', payload.eventType);
              }
            } catch (realtimeError) {
              console.error('Error processing real-time notification update:', realtimeError);
              // Don't throw the error, just log it to prevent subscription failure
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to notifications');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to notifications channel:', err);
            setError('Failed to connect to real-time notifications');
          } else if (status === 'TIMED_OUT') {
            console.error('Notifications subscription timed out');
            setError('Notifications connection timed out');
          } else if (status === 'CLOSED') {
            console.log('Notifications channel closed');
          }
        });
    } catch (subscriptionError) {
      console.error('Error setting up real-time subscription:', subscriptionError);
      setError('Failed to set up notifications subscription');
    }

    // Cleanup subscription on unmount or user change
    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (cleanupError) {
          console.error('Error cleaning up notification subscription:', cleanupError);
        }
      }
    };
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only update their own notifications

      if (error) throw error;

      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      setError(err.message || 'Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false); // Only update unread notifications

      if (error) throw error;

      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      setError(err.message || 'Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only delete their own notifications

      if (error) throw error;

      // Update local state immediately for better UX
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    } catch (err: any) {
      console.error('Error deleting notification:', err);
      setError(err.message || 'Failed to delete notification');
    }
  };

  const clearAll = async () => {
    if (!user?.id) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete all notifications? This action cannot be undone.'
    );
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state immediately for better UX
      setNotifications([]);
    } catch (err: any) {
      console.error('Error clearing all notifications:', err);
      setError(err.message || 'Failed to clear all notifications');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refetch: fetchNotifications
  };
};