# Incident Management Pages

## Overview

Two new incident management pages have been added to achieve 100% UI coverage:

1. **IncidentsPage.jsx** - List view for all operational incidents
2. **IncidentDetail.jsx** - Detailed view for individual incidents

Both pages follow Eden ERP's Material Design aesthetic and integrate with the existing incident tracking system.

## Features

### IncidentsPage (`/incidents`)

**UI Components:**
- Material Design cards with color-coded severity indicators
- Real-time filtering (All, Open, Acknowledged, Critical)
- Sorting options (Newest First, By Severity, By Escalation Level)
- Status badges and escalation level indicators
- Responsive grid layout

**States Handled:**
- ✅ Loading - Animated skeleton loader
- ✅ Empty - "No incidents" state
- ✅ Error - Retry functionality
- ✅ Unauthorized - Access denied message
- ✅ Success - Incident list with interactions

**Data Display:**
- Incident key/identifier
- Route and kind
- Status (open/acknowledged)
- Severity level (critical/high/medium/low)
- Escalation level (if > 0)
- First seen timestamp

### IncidentDetail (`/incidents/:id`)

**UI Components:**
- Detailed incident information card
- Acknowledgment button with confirmation
- Metadata and owner display (JSON formatted)
- Back navigation to incident list
- Status and severity badges

**States Handled:**
- ✅ Loading - Skeleton loader
- ✅ Not Found - 404 handling
- ✅ Error - Retry with navigation fallback
- ✅ Unauthorized - Permission denied
- ✅ Success - Full incident details

**Functionality:**
- One-click incident acknowledgment
- Real-time status updates
- Optimistic UI updates
- Error handling with retry

## API Integration

**Endpoints Used:**
- `GET /ops/incidents` - List all incidents
- `GET /ops/incidents/:id` - Get incident details
- `POST /ops/incidents/:id/ack` - Acknowledge incident

**Authentication:**
- Bearer token from localStorage
- RBAC protection (`admin:manage` permission required)

## Styling

Both pages use Eden ERP's Material Design system:

- **Typography**: Roboto font family
- **Colors**:
  - Critical: #D32F2F (red)
  - High: #F57C00 (orange)
  - Medium: #FBC02D (yellow)
  - Low: #689F38 (green)
- **Spacing**: 8px grid system
- **Elevation**: Card shadows with hover effects
- **Transitions**: Smooth 0.2s cubic-bezier animations

## Routing

Routes added to `App.jsx`:

```jsx
<Route path="/incidents" element={
  <RequireAuth requiredPermission="admin:manage">
    <IncidentsPage />
  </RequireAuth>
} />

<Route path="/incidents/:id" element={
  <RequireAuth requiredPermission="admin:manage">
    <IncidentDetail />
  </RequireAuth>
} />
```

## Coverage Verification

Run the coverage check:

```bash
npm run check:ui
```

Expected output:
```
✅ UI coverage check PASSED
   All required pages exist!
```

## Next Steps

These pages provide the foundation for incident management. Future enhancements could include:

1. Real-time incident updates via WebSocket
2. Incident filtering by time range
3. Bulk acknowledgment functionality
4. Incident history and timeline
5. Related alarms and metrics visualization
6. Export to CSV functionality
