import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Link } from 'react-router-dom';

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

function getActivityIcon(type) {
  switch(type) {
    case 'ball_handoff': return '🏀';
    case 'comment_added': return '💬';
    case 'status_changed': return '📊';
    case 'task_created': return '✨';
    case 'task_assigned': return '👤';
    case 'task_overdue': return '⏰';
    default: return '📋';
  }
}

function formatActivityText(notification) {
  const { type, payload, actor_email } = notification;
  const actorName = actor_email ? actor_email.split('@')[0] : 'Someone';
  
  switch(type) {
    case "ball_handoff":
      return `Task handed to ${payload.toDepartment}: ${payload.title}`;
    case "comment_added":
      return `${actorName} commented on: ${payload.title}`;
    case "status_changed":
      return `Task "${payload.title}" changed to ${payload.newStatus}`;
    case "task_created":
      return `New task created: ${payload.title || 'Untitled'}`;
    case "task_assigned":
      return `Task assigned to you: ${payload.title || 'Untitled'}`;
    case "task_overdue":
      return `Task overdue: ${payload.title || 'Untitled'}`;
    default:
      return payload.title || type || "Activity";
  }
}

export default function RecentActivityFeed() {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['recent_activity'],
    queryFn: () => apiService.listRecentNotifications(),
    refetchInterval: 30000,
  });

  const recentActivities = notifications.slice(0, 10);

  if (isLoading) {
    return (
      <div className="card">
        <div className="skeleton mb-4" style={{width: '25%', height: '20px'}}></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 mb-3">
            <div className="skeleton rounded-full" style={{width: '32px', height: '32px'}}></div>
            <div className="flex-1">
              <div className="skeleton mb-2" style={{width: '75%', height: '16px'}}></div>
              <div className="skeleton" style={{width: '25%', height: '12px'}}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (recentActivities.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold mb-3">Recent Activity</h3>
        <div className="text-center py-8 text-muted">
          <div className="text-display mb-2">🎉</div>
          <p className="text-body">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {recentActivities.map((activity) => (
          <div key={activity.id} className="flex gap-3 items-start">
            <div className="flex-shrink-0 rounded-full bg-primary-light flex items-center justify-center text-large" style={{width: '32px', height: '32px'}}>
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body">
                {formatActivityText(activity)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-caption">
                  {formatRelativeTime(activity.created_at)}
                </span>
                {activity.task_id && (
                  <>
                    <span className="text-caption">•</span>
                    <Link 
                      to={`/task/${activity.task_id}`}
                      className="text-caption text-link hover:underline"
                    >
                      View task
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
