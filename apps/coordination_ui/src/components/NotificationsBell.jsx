import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";
import { Link } from "react-router-dom";
import { useToaster } from "./Toaster";

function formatRelativeTime(dateString) {
  const now = new Date();
  const then = new Date(dateString);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const lastSeen = useRef(0);
  const { push } = useToaster();

  const { data: items = [], refetch } = useQuery({
    queryKey: ["recent_notifications"],
    queryFn: () => apiService.listRecentNotifications(),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!items.length) return;
    const latestTs = Math.max(...items.map(n => +new Date(n.created_at)));
    if (lastSeen.current && latestTs > lastSeen.current) {
      push("success", "New notifications received");
    }
    lastSeen.current = latestTs;
  }, [items, push]);

  const unreadCount = useMemo(() => items.filter(n => !n.read_at).length, [items]);

  // Group notifications by type
  const groupedNotifications = useMemo(() => {
    const groups = {
      ball_handoff: [],
      comment_added: [],
      status_changed: [],
      other: []
    };

    items.forEach(n => {
      if (groups[n.type]) {
        groups[n.type].push(n);
      } else {
        groups.other.push(n);
      }
    });

    return groups;
  }, [items]);

  const groupConfig = {
    ball_handoff: { title: '🏀 Ball Handoffs', items: groupedNotifications.ball_handoff },
    comment_added: { title: '💬 Comments', items: groupedNotifications.comment_added },
    status_changed: { title: '📊 Status Changes', items: groupedNotifications.status_changed },
    other: { title: '📋 Other', items: groupedNotifications.other }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await apiService.markNotificationRead(id);
      push("success", "Notification marked as read");
      refetch();
    } catch (error) {
      push("error", "Failed to mark notification as read");
      console.error("Mark as read error:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      push("success", "All notifications marked as read");
      refetch();
    } catch (error) {
      push("error", "Failed to mark all as read");
      console.error("Mark all as read error:", error);
    }
  };

  return (
    <div className="relative">
      <button className="relative px-3 py-1 border rounded text-sm" onClick={() => setOpen(o => !o)}>
        🔔 Notifications
        {unreadCount > 0 && (
          <span className="ml-2 inline-block text-xs bg-amber-500 text-white rounded-full px-2">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-auto bg-white border rounded shadow z-40 dropdown-enter dropdown-enter-active">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="font-semibold text-sm">Notifications ({items.length})</div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button 
                  className="text-xs underline text-blue-600 hover:text-blue-800" 
                  onClick={handleMarkAllAsRead}
                >
                  Mark all read
                </button>
              )}
              <button className="text-xs underline" onClick={() => refetch()}>Refresh</button>
            </div>
          </div>
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-medium">All caught up!</p>
              <p className="text-sm">No new notifications</p>
            </div>
          ) : (
            <div>
              {Object.entries(groupConfig).map(([key, { title, items: groupItems }]) => {
                if (groupItems.length === 0) return null;
                
                return (
                  <div key={key}>
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <div className="text-xs font-semibold text-gray-700">
                        {title} ({groupItems.length})
                      </div>
                    </div>
                    <ul className="divide-y">
                      {groupItems.map((n) => {
                        const isUnread = !n.read_at;
                        return (
                          <li key={n.id} className={`p-3 text-sm flex items-start justify-between gap-3 ${isUnread ? 'bg-blue-50 unread-notification' : 'bg-white'}`}>
                            <div className="flex-1">
                              <div className={`${isUnread ? 'font-bold' : 'font-medium'}`}>
                                {formatNotificationText(n)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {formatRelativeTime(n.created_at)}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              {n.task_id && (
                                <Link 
                                  className="px-2 py-1 border rounded text-xs bg-white hover:bg-gray-50 text-center" 
                                  to={`/task/${n.task_id}`}
                                  onClick={() => setOpen(false)}
                                >
                                  Open
                                </Link>
                              )}
                              {isUnread && (
                                <button
                                  className="px-2 py-1 border rounded text-xs bg-white hover:bg-gray-50"
                                  onClick={() => handleMarkAsRead(n.id)}
                                >
                                  ✓ Read
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatNotificationText(notification) {
  const { type, payload, actor_email } = notification;
  const actorName = actor_email ? actor_email.split('@')[0] : 'Someone';
  
  switch(type) {
    case "ball_handoff":
      return `🏀 Task handed to ${payload.toDepartment}: ${payload.title}`;
    case "comment_added":
      return `💬 ${actorName} commented on: ${payload.title}`;
    case "status_changed":
      return `📊 Task "${payload.title}" changed to ${payload.newStatus}`;
    case "task_created":
      return `✨ New task created: ${payload.title || 'Untitled'}`;
    case "task_assigned":
      return `👤 Task assigned to you: ${payload.title || 'Untitled'}`;
    case "task_overdue":
      return `⏰ Task overdue: ${payload.title || 'Untitled'}`;
    default:
      return payload.title || type || "Notification";
  }
}
