//index of notificationsContext 
import React, { useContext, useMemo } from "react";
import { useStudentNotifications } from "../../hooks/useStudentNotifications";

const NotificationsContext = React.createContext(null);

export function useNotifications() {
  return useContext(NotificationsContext) || {
    notifications: [],
    loading: false,
    unreadCount: 0,
    lastSeenAt: 0,
    markAllSeen: () => {},
  };
}

export function NotificationsProvider({ children }) {
  const notifState = useStudentNotifications();
  const value = useMemo(() => notifState, [notifState]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

