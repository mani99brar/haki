"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

type NotificationType = "success" | "error" | "info";

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback(
    (message: string, type: NotificationType = "info") => {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications((prev) => [...prev, { id, message, type }]);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 4000);
    },
    [],
  );

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}

      {/* Notification Container */}
      <div className="notification-stack">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`haki-notification ${n.type}`}
            >
              <div className="notification-icon">
                {n.type === "success" && "🎯"}
                {n.type === "error" && "⚠️"}
                {n.type === "info" && "ℹ️"}
              </div>
              <div className="notification-message">{n.message}</div>
              <button
                className="notification-close"
                onClick={() =>
                  setNotifications((prev) =>
                    prev.filter((notif) => notif.id !== n.id),
                  )
                }
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error("useNotification must be used within NotificationProvider");
  return context;
};
