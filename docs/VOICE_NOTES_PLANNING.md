# Tasks → Voice Notes (Flagged, Internal) - Planning Document

**Created:** 2025-10-28  
**Module:** Tasks  
**Status:** Planned  
**Feature Flag:** `voiceToText` (default: OFF)  
**RBAC Impact:** `tasks.voice.create`, `tasks.voice.read`

---

## Pages Impacted
- Task Detail (recording UI + playback list)
- Task List (🎙️ badge when voice notes exist)
- Task API (new endpoints)

---

## Backend Changes
POST /api/tasks/:id/voice-notes (multipart, max 2 min / 5 MB, webm/ogg/mp4), GET list; store file URL + duration; no external transcription yet.

---

## Frontend Changes
Record/Stop/Save UI on Task Detail behind `<FeatureGate feature="voiceToText">`; show waveform placeholder; playback list with duration; badge on Task List when task has voice notes.

---

## Acceptance Criteria

### AC — Tasks: Voice Notes (Flagged, Internal)

#### 1) Visibility & Guarding
- Feature flag `voiceToText` must be ON for UI to appear.
- Button block visible only if role has `tasks.voice.create`; playback requires `tasks.voice.read`.
- Backend returns 403 for unauthorized create/read.

#### 2) Recording & Upload (Internal)
- UI provides Record → Stop → Save flow (MediaRecorder).
- Accepts max 2 minutes OR 5 MB, whichever first; shows countdown.
- On Save, uploads multipart to POST /api/tasks/:id/voice-notes; server returns `{id, url, duration, createdAt}`.

#### 3) Playback & Listing
- Task Detail shows a list of voice notes with timestamp, duration, and a Play control.
- Task List shows a small badge "🎙️" when any voice notes exist (feature-flagged).
- Delete/hard-delete NOT included in this slice.

#### 4) Error & States
- If mic permission denied → inline guidance; Save disabled.
- Large/long recording → client blocks with message; server also enforces 413 (payload too large).
- Network/server errors show non-blocking toast; no partial UI states linger.

#### 5) API Contract (v1, internal)
- **POST /api/tasks/:id/voice-notes** (multipart: file, duration)
  - → 201 `{ item: { id, taskId, url, duration, createdAt } }`
  - → 400/403/413 on error
  
- **GET /api/tasks/:id/voice-notes**
  - → 200 `{ items: [ { id, url, duration, createdAt } ] }`

#### 6) Tests & Docs
- Smoke: Admin can record+save+play; Viewer can play (if `tasks.voice.read`) but cannot record.
- Feature flag OFF → no recording UI, no badge; direct endpoints still RBAC-enforced.
- Add `VOICE_NOTES.md` with usage, limits, and RBAC notes.

---

## Test Scripts

### Test — Voice Notes (Flagged, Internal)

#### Happy Path
**Given:** Flag ON, role = Admin

1. Open any Task Detail → "Record" visible.
2. Click Record → countdown starts; Stop within 10s.
3. Click Save → 201; note appears with duration; Play works.

#### Negative Tests

**A) Flag OFF**
- "Record" hidden
- Badge hidden

**B) Viewer role**
- Play works (if `tasks.voice.read`)
- Record hidden
- POST returns 403

**C) Over-limit**
- Simulate >2min or >5MB
- Client blocks with message
- If forced, server returns 413

#### Artifacts Required
- 3 screenshots:
  1. Recording UI with countdown
  2. Saved note list with duration
  3. Task List badge (🎙️)

---

## Implementation Plan

### Phase 1: Database Schema
- Create `task_voice_notes` table:
  - `id` (primary key)
  - `task_id` (foreign key)
  - `file_url` (storage path)
  - `duration_seconds` (integer)
  - `created_by` (user ID)
  - `created_at` (timestamp)

### Phase 2: Backend API
- Add multipart file upload handler
- Implement 2min/5MB validation
- Create POST /api/tasks/:id/voice-notes endpoint
- Create GET /api/tasks/:id/voice-notes endpoint
- Add RBAC middleware (`tasks.voice.create`, `tasks.voice.read`)

### Phase 3: Frontend Recording UI
- Create `VoiceRecorder` component with MediaRecorder API
- Add countdown timer (max 2min)
- Implement file size check (max 5MB)
- Add microphone permission handling
- Add behind `<FeatureGate feature="voiceToText">`
- Add RBAC guard `<RequirePermission resource="tasks.voice" action="create">`

### Phase 4: Frontend Playback
- Create `VoiceNotesList` component
- Add audio player controls
- Show duration and timestamp
- Add badge to Task List when notes exist

### Phase 5: Testing & Docs
- Smoke test all scenarios
- Create VOICE_NOTES.md documentation
- Update RBAC configuration
- Update feature flags documentation

---

## Technical Notes

### Storage Strategy
- Use tmp_uploads/ for initial upload
- Store with unique filename (UUID)
- No transcription in this slice (future enhancement)

### Supported Formats
- webm (Chrome/Edge)
- ogg (Firefox)
- mp4 (Safari)

### RBAC Permissions
Add to `apps/coordination_ui/src/config/rbac.json`:
```json
{
  "tasks.voice.create": ["Admin", "Project Manager", "Ops Lead"],
  "tasks.voice.read": ["Admin", "Project Manager", "Ops Lead", "Viewer"]
}
```

### Feature Flag
Already exists in `apps/coordination_ui/src/config/features.json`:
```json
{
  "voiceToText": false
}
```

---

## Security Considerations

1. **File size limits** - Enforce 5MB max on client AND server
2. **Duration limits** - Enforce 2min max on client AND server
3. **File type validation** - Accept only audio/* MIME types
4. **RBAC enforcement** - Check permissions on all endpoints
5. **Storage isolation** - Store files with unique IDs to prevent conflicts

---

## Success Criteria

✅ Admin can record and save voice notes  
✅ Voice notes appear in playback list with Play button  
✅ Task List shows 🎙️ badge when notes exist  
✅ Viewer can play but not record (RBAC enforced)  
✅ Feature flag OFF hides all UI  
✅ Over-limit recordings blocked (client + server)  
✅ Microphone permission handling works  
✅ All endpoints return proper error codes  
✅ Documentation complete  

---

## Next Steps After This Slice

1. **Phase 2:** Add transcription API integration (OpenAI Whisper)
2. **Phase 3:** Add delete/hard-delete for voice notes
3. **Phase 4:** Add waveform visualization
4. **Phase 5:** Add voice note search/filter

---

**Status:** Ready for implementation  
**Estimated Effort:** 2-3 development sessions  
**Flag Default:** OFF (internal-only testing)
