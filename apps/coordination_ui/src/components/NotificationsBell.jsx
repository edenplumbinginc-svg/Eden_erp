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
    <div style={{position: 'relative'}}>
      <button className="btn btn-secondary" onClick={() => setOpen(o => !o)}>
        🔔 Notifications
        {unreadCount > 0 && (
          <span className="inline-flex text-caption text-white rounded-full" style={{
            marginLeft: 'var(--space-1)',
            backgroundColor: 'var(--md-warning)',
            padding: '2px 8px'
          }}>
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="dropdown-enter dropdown-enter-active" style={{
          position: 'absolute',
          right: 0,
          marginTop: 'var(--space-1)',
          width: '384px',
          maxHeight: '384px',
          overflow: 'auto',
          backgroundColor: 'var(--md-surface)',
          border: '1px solid var(--md-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--md-shadow-3)',
          zIndex: 40
        }}>
          <div className="flex items-center justify-between" style={{
            padding: 'var(--space-2) var(--space-3)',
            borderBottom: '1px solid var(--md-divider)'
          }}>
            <div className="font-semibold text-body">Notifications ({items.length})</div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button 
                  className="text-caption text-link hover:underline" 
                  onClick={handleMarkAllAsRead}
                >
                  Mark all read
                </button>
              )}
              <button className="text-caption text-link hover:underline" onClick={() => refetch()}>Refresh</button>
            </div>
          </div>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <div className="text-display mb-2">🎉</div>
              <p className="font-medium">All caught up!</p>
              <p className="text-body">No new notifications</p>
            </div>
          ) : (
            <div>
              {Object.entries(groupConfig).map(([key, { title, items: groupItems }]) => {
                if (groupItems.length === 0) return null;
                
                return (
                  <div key={key}>
                    <div style={{
                      padding: 'var(--space-2) var(--space-3)',
                      backgroundColor: 'var(--md-surface-variant)',
                      borderBottom: '1px solid var(--md-divider)'
                    }}>
                      <div className="text-caption font-semibold text-muted">
                        {title} ({groupItems.length})
                      </div>
                    </div>
                    <ul style={{borderTop: '1px solid var(--md-divider)'}}>
                      {groupItems.map((n) => {
                        const isUnread = !n.read_at;
                        return (
                          <li key={n.id} className={`text-body flex items-start justify-between gap-3 ${isUnread ? 'unread-notification' : ''}`} style={{
                            padding: 'var(--space-3)',
                            backgroundColor: isUnread ? 'rgba(26, 115, 232, 0.08)' : 'var(--md-surface)',
                            borderBottom: '1px solid var(--md-divider)'
                          }}>
                            <div className="flex-1">
                              <div className={isUnread ? 'font-bold' : 'font-medium'}>
                                {formatNotificationText(n)}
                              </div>
                              <div className="text-caption mt-1">
                                {formatRelativeTime(n.created_at)}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              {n.task_id && (
                                <Link 
                                  className="btn btn-secondary text-caption" 
                                  to={`/task/${n.task_id}`}
                                  onClick={() => setOpen(false)}
                                >
                                  Open
                                </Link>
                              )}
                              {isUnread && (
                                <button
                                  className="btn btn-secondary text-caption"
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
