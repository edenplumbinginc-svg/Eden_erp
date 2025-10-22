import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";
import { Link } from "react-router-dom";
import { useToaster } from "./Toaster";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const lastSeen = useRef(0);
  const { push } = useToaster();

  const { data: items = [], refetch } = useQuery({
    queryKey: ["recent_notifications"],
    queryFn: () => apiService.listRecentNotifications(),
    refetchInterval: 30_000,  // poll every 30s
  });

  // toast on new items
  useEffect(() => {
    if (!items.length) return;
    const latestTs = Math.max(...items.map(n => +new Date(n.created_at)));
    if (lastSeen.current && latestTs > lastSeen.current) {
      push("success", "New notifications received");
    }
    lastSeen.current = latestTs;
  }, [items, push]);

  // For now, assume all are unread since we don't have read_at field
  const unreadCount = useMemo(() => items.length, [items]);

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
        <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-auto bg-white border rounded shadow z-40">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="font-semibold text-sm">Recent</div>
            <button className="text-xs underline" onClick={() => refetch()}>Refresh</button>
          </div>
          <ul className="divide-y">
            {items.length === 0 && <li className="p-3 text-sm text-gray-500">No notifications.</li>}
            {items.map((n, i) => (
              <li key={n.id || i} className="p-3 text-sm flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{labelFor(n.type)}</div>
                  <div className="text-xs text-gray-600">
                    {n.entity || n.task_id || n.project_id} • {new Date(n.created_at).toLocaleString()}
                  </div>
                  {n.payload?.title && <div className="text-xs mt-1">{n.payload.title}</div>}
                </div>
                {n.task_id && (
                  <Link className="px-2 py-1 border rounded text-xs" to={`/task/${n.task_id}`}>Open</Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function labelFor(type){
  switch(type){
    case "task_created": return "Task created";
    case "task_assigned": return "Task assigned";
    case "status_changed": return "Status changed";
    case "task_overdue": return "Task overdue";
    case "comment_added": return "Comment added";
    default: return type || "Notification";
  }
}
