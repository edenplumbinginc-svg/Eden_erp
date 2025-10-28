# Voice Notes - Feature Documentation

## Overview
Voice Notes allows users to record and attach audio notes to tasks. This feature is currently **INTERNAL ONLY** and requires the `voiceToText` feature flag to be enabled.

## Current Status
**Version:** 1.0 (Internal Beta)  
**Feature Flag:** `voiceToText` (default: **OFF**)  
**Access:** Flagged + RBAC controlled

---

## Features

### Recording
- **Max Duration:** 2 minutes (120 seconds)
- **Max File Size:** 5MB
- **Supported Formats:** webm, ogg, mp4, mpeg, wav (audio/*)
- **Real-time countdown** timer during recording
- **Audio preview** before saving
- **Microphone permission** handling with user-friendly messages

### Playback
- View all voice notes attached to a task
- Click Play button to listen
- See duration (formatted as M:SS, e.g., "1:34")
- See relative timestamps (e.g., "2 hours ago")

### Storage
- Files stored in `tmp_uploads/` directory
- Unique UUID filenames prevent conflicts
- Database tracks: file URL, duration, creator, timestamp

---

## Usage

### For End Users

1. **Enable Feature Flag** (Internal Admin Only)
   - Edit `apps/coordination_ui/src/config/features.json`
   - Set `"voiceToText": true`
   - Restart frontend workflow

2. **Recording a Voice Note**
   - Navigate to any Task Detail page
   - Scroll to "Voice Notes" section (appears if flag is ON and you have permission)
   - Click **"🎙️ Record"** button
   - Allow microphone permission when prompted
   - Speak your note (max 2 minutes)
   - Click **"⏹️ Stop"** when finished
   - Review the audio with **"▶️ Preview"** button
   - Click **"💾 Save"** to upload
   - Recording automatically stops at 2 minutes if not manually stopped

3. **Playing Voice Notes**
   - Scroll to "Voice Notes" section on Task Detail page
   - Click **"▶️ Play"** button next to any voice note
   - Audio plays inline
   - Click **"⏸️ Pause"** to stop playback

---

## Permissions (RBAC)

### voice.create (Can Record)
Roles with **create** permission:
- Admin
- Ops Lead
- Field Ops
- Project Manager
- Contributor
- Office Admin
- Estimator

### voice.read (Can Play/View)
Roles with **read** permission:
- **All roles** (including Viewer, Accounting, etc.)

**Note:** Frontend automatically hides controls based on permissions using `<RequirePermission>` guards.

---

## Technical Limits

| Limit | Value | Enforcement |
|-------|-------|-------------|
| Max Duration | 120 seconds (2 min) | Client blocks at 2min; Server returns 400 if exceeded |
| Max File Size | 5 MB | Client checks before upload; Server returns 413 if exceeded |
| File Types | audio/* | Server validates MIME type; rejects non-audio files |

---

## API Endpoints

### POST /api/tasks/:id/voice-notes
Upload a voice note to a task.

**Auth:** Required  
**Permission:** `voice.create`  
**Content-Type:** `multipart/form-data`

**Request Body:**
```
file: <binary audio file>
duration: <integer seconds>
```

**Success Response (201):**
```json
{
  "ok": true,
  "item": {
    "id": "uuid",
    "taskId": "uuid",
    "url": "/tmp_uploads/filename.webm",
    "durationSeconds": 45,
    "createdAt": "2025-10-28T20:00:00Z",
    "createdBy": "uuid"
  }
}
```

**Error Responses:**
- `400` - Validation error (duration > 120s)
- `403` - Permission denied (no voice.create permission)
- `404` - Task not found
- `413` - File too large (> 5MB)

---

### GET /api/tasks/:id/voice-notes
List all voice notes for a task.

**Auth:** Required  
**Permission:** `voice.read`

**Success Response (200):**
```json
{
  "ok": true,
  "items": [
    {
      "id": "uuid",
      "taskId": "uuid",
      "url": "/tmp_uploads/filename.webm",
      "durationSeconds": 45,
      "createdAt": "2025-10-28T20:00:00Z",
      "createdBy": "uuid"
    }
  ]
}
```

**Error Responses:**
- `403` - Permission denied (no voice.read permission)
- `404` - Task not found

---

## Error Handling

### Microphone Permission Denied
**User sees:** "❌ Microphone access denied. Please allow microphone access in your browser settings."  
**Resolution:** User must grant microphone permission in browser.

### File Too Large
**User sees:** Toast notification: "❌ Recording too large (>5MB). Please record a shorter message."  
**Resolution:** Record a shorter message or reduce audio quality.

### Duration Exceeded
**Client:** Automatically stops recording at 2 minutes and warns user.  
**Server:** Returns 400 error if duration >120s somehow bypasses client check.

### No Microphone Found
**User sees:** "❌ No microphone detected. Please connect a microphone and try again."  
**Resolution:** User must connect/enable a microphone device.

### Network Errors
**User sees:** Toast notification: "❌ Upload failed. Please check your connection and try again."  
**Resolution:** Check network connectivity and retry.

---

## Feature Flag Control

### Enabling Voice Notes (Internal Only)

**File:** `apps/coordination_ui/src/config/features.json`

```json
{
  "voiceToText": true,  // ← Set to true to enable
  "hardDeleteProjects": false,
  "includeArchivedToggle": true,
  "rbacDevBanner": true
}
```

**⚠️ Important:** 
- Feature flag **defaults to OFF**
- Keep OFF in production unless actively testing
- Only internal admins should enable this flag
- Restart frontend workflow after changing: `npm run dev:web`

---

## Database Schema

**Table:** `task_voice_notes`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| task_id | uuid | Foreign key to tasks table (CASCADE DELETE) |
| file_url | text | Path to audio file (relative to server) |
| duration_seconds | integer | Duration in seconds |
| created_by | uuid | Foreign key to users table |
| created_at | timestamp | When the voice note was created |

**Indexes:**
- `idx_voice_notes_task` on `task_id` (for fast task lookups)
- `idx_voice_notes_created` on `created_at DESC` (for chronological sorting)

---

## Future Enhancements (Not in v1.0)

### Planned Features:
1. **Transcription** - Integrate OpenAI Whisper API for automatic transcription
2. **Waveform Visualization** - Show audio waveform during playback
3. **Delete/Edit** - Allow users to delete voice notes
4. **Search** - Search transcribed voice notes
5. **Badge** - Show 🎙️ badge on Task List when voice notes exist
6. **Compression** - Server-side audio compression to reduce file sizes

### Not Currently Supported:
- ❌ Transcription (manual or automatic)
- ❌ Deleting voice notes
- ❌ Editing/re-recording
- ❌ Waveform visualization
- ❌ Download voice notes
- ❌ Share voice notes externally

---

## Testing Checklist

### Manual Testing Scenarios

**✅ Happy Path (Admin)**
1. Enable `voiceToText` flag
2. Login as Admin role
3. Navigate to any Task Detail page
4. See "Voice Notes" section with Record button
5. Click Record → Allow mic → Speak → Stop → Save
6. See voice note appear in list
7. Click Play → Hear audio

**✅ Permission Test (Viewer)**
1. Login as Viewer role
2. Navigate to Task Detail page
3. See "Voice Notes" section but NO Record button
4. See existing voice notes with Play button
5. Can play existing notes

**✅ Feature Flag OFF**
1. Set `voiceToText: false`
2. Restart frontend
3. Navigate to Task Detail page
4. Voice Notes section should NOT appear

**✅ Validation Tests**
1. Record for >2 minutes → Auto-stops at 2 min
2. Deny microphone permission → See error message
3. Upload large file → Blocked with error
4. No microphone device → See error message

---

## Security Considerations

### RBAC Enforcement
- ✅ Frontend hides controls based on permissions (UX optimization)
- ✅ Backend enforces permissions on ALL endpoints (security layer)
- ✅ Direct API calls without permission return 403

### File Upload Security
- ✅ File size limit enforced (5MB)
- ✅ MIME type validation (audio/* only)
- ✅ Unique UUID filenames prevent overwrites
- ✅ Files stored in tmp_uploads/ (not publicly accessible)

### Data Privacy
- ✅ Voice notes tied to task (deleted if task is deleted via CASCADE)
- ✅ Creator tracked (created_by field)
- ✅ RBAC controls who can read voice notes

---

## Troubleshooting

### "I can't see the Record button"
**Check:**
1. Is `voiceToText` feature flag enabled?
2. Does your role have `voice.create` permission?
3. Did you restart the frontend after enabling the flag?

### "Recording doesn't start"
**Check:**
1. Did you allow microphone permission?
2. Is your microphone connected and enabled?
3. Check browser console for errors

### "Upload fails"
**Check:**
1. Is the file <5MB?
2. Is the duration <120 seconds?
3. Is the backend server running?
4. Check network connectivity

### "Voice notes don't appear"
**Check:**
1. Does your role have `voice.read` permission?
2. Are there actually voice notes attached to this task?
3. Check browser console for API errors

---

## Support

**For Internal Use Only**  
Contact: Development Team  
Flag Status: Default OFF (enable manually for testing)

---

**Last Updated:** 2025-10-28  
**Version:** 1.0 (Internal Beta)  
**Status:** Feature-flagged, RBAC-protected, Internal Only
