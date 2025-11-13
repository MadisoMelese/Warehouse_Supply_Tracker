import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
    
    // Play sound notification using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Frequency in Hz
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (err) {
      console.log('Could not play notification sound:', err);
    }
    
    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  }, []);

  // Connect to Socket.io when user is authenticated
  useEffect(() => {
    if (!user) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const newSocket = io(API_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Listen for low stock alerts (admin only)
    if (isAdmin) {
      newSocket.on('low_stock_alert', (data) => {
        console.log('Low stock alert received:', data);
        addNotification({
          id: Date.now() + Math.random(),
          type: 'low_stock',
          title: data.title || 'Low Stock Alert',
          message: data.message,
          items: data.items,
          read: false,
          timestamp: data.timestamp || new Date().toISOString()
        });
      });

      // Listen for movement requests (admin only)
      newSocket.on('movement_request', (data) => {
        console.log('Movement request received:', data);
        addNotification({
          id: Date.now() + Math.random(),
          type: 'movement_request',
          title: data.title || 'New Movement Request',
          message: data.message,
          movementId: data.movementId,
          itemName: data.itemName,
          movementType: data.type,
          quantity: data.quantity,
          requestedBy: data.requestedBy,
          itemId: data.itemId,
          read: false,
          timestamp: data.timestamp || new Date().toISOString()
        });
      });
    }

    // Listen for movement approval/rejection (all users)
    newSocket.on('movement_approved', (data) => {
      console.log('Movement approved received:', data);
      addNotification({
        id: Date.now() + Math.random(),
        type: 'movement_approved',
        title: data.title || 'Movement Request Approved',
        message: data.message,
        movementId: data.movementId,
        itemName: data.itemName,
        movementType: data.movementType,
        quantity: data.quantity,
        read: false,
        timestamp: data.timestamp || new Date().toISOString()
      });
    });

    newSocket.on('movement_rejected', (data) => {
      console.log('Movement rejected received:', data);
      addNotification({
        id: Date.now() + Math.random(),
        type: 'movement_rejected',
        title: data.title || 'Movement Request Rejected',
        message: data.message,
        movementId: data.movementId,
        itemName: data.itemName,
        movementType: data.movementType,
        quantity: data.quantity,
        reason: data.reason,
        read: false,
        timestamp: data.timestamp || new Date().toISOString()
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user, isAdmin, addNotification]);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => {
      const notif = prev.find((n) => n.id === id);
      if (notif && !notif.read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    socket
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

