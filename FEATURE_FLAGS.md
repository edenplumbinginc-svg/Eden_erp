# Feature Flags System ✅

## Overview
Lightweight, JSON-based feature flag system for shipping experimental features without churning RBAC or UI code. Simply flip a JSON switch—no code refactors needed.

## Implementation

### Architecture
**Three-layer system:**
1. **Configuration layer** - `features.json` stores flag values
2. **Helper layer** - `featureFlags.ts` provides type-safe access
3. **Component layer** - `<FeatureGate>` component wraps UI elements

### Files Created

#### 1. Configuration: `apps/coordination_ui/src/config/features.json`
```json
{
  "voiceToText": false,
  "hardDeleteProjects": false,
  "includeArchivedToggle": true,
  "rbacDevBanner": true
}
```

**Flag naming convention:** Use capability names (e.g., `voiceToText`), not UI element names (e.g., `showMicIcon`).

#### 2. Helper: `apps/coordination_ui/src/lib/featureFlags.ts`
```typescript
import features from "../config/features.json";

export type FeatureKey = keyof typeof features;

export function hasFeature(key: FeatureKey): boolean {
  return Boolean((features as Record<string, unknown>)[key]);
}
```

**Type safety:** `FeatureKey` ensures only valid feature names can be checked.

#### 3. Component: `apps/coordination_ui/src/components/FeatureGate.tsx`
```typescript
import type { ReactNode } from "react";
import { hasFeature, type FeatureKey } from "../lib/featureFlags";

export default function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return hasFeature(feature) ? <>{children}</> : <>{fallback}</>;
}
```

**Simple API:** Wrap any UI element to gate it behind a feature flag.

## Usage Example

### Smoke Test (Project Detail Page)
Added a dev-only voice note button gated behind `voiceToText` flag:

```jsx
import FeatureGate from "../components/FeatureGate";

<FeatureGate feature="voiceToText">
  <button 
    className="btn btn-secondary" 
    onClick={() => alert('Voice note feature coming soon!')}
    aria-label="Record voice note (dev)"
  >
    🎙️ Voice note (dev)
  </button>
</FeatureGate>
```

**Result:**
- When `voiceToText: false` → Button hidden
- When `voiceToText: true` → Button visible
- Hot reload works instantly (no restart needed)

## Testing the System

### Test 1: Flag Off (Default)
1. Navigate to any project page
2. ✅ Voice note button is **NOT visible**
3. Check `features.json` → `voiceToText: false`

### Test 2: Toggle Flag On
1. Edit `features.json` → Change `voiceToText: true`
2. Save file → Vite hot reloads automatically
3. ✅ Voice note button **appears instantly**
4. Click button → Alert shows "Voice note feature coming soon!"

### Test 3: Toggle Flag Off Again
1. Edit `features.json` → Change `voiceToText: false`
2. Save file → Vite hot reloads
3. ✅ Voice note button **disappears instantly**

## Benefits

✅ **Zero code changes** - Just flip JSON switches
✅ **Type-safe** - TypeScript prevents typos in feature names
✅ **Hot reload** - Changes apply instantly without restart
✅ **Simple API** - Wrap components with `<FeatureGate>`
✅ **Coarse-grained** - Named by capability, not UI element
✅ **No RBAC churn** - Ship experimental features independently
✅ **Telemetry-ready** - Easy to track usage before enabling by default

## Design Decisions

### Why JSON instead of environment variables?
- **Faster iteration** - Edit JSON and see changes instantly
- **No restart needed** - Vite hot reloads JSON files
- **Version control** - Feature flags tracked in Git
- **Multiple flags** - Easy to manage many flags in one file

### Why component wrapper instead of hooks?
- **Declarative** - Clear intent at usage site
- **Composable** - Works with any React component
- **Fallback support** - Optional alternative content
- **Simple** - No complex hook logic needed

### Why relative imports instead of path alias?
- **Immediate compatibility** - Works without Vite config
- **No TypeScript setup** - Skip baseUrl/paths configuration
- **Portable** - Works in any build tool
- **Debugging** - Clear file relationships

## Adding New Feature Flags

### Step 1: Add flag to configuration
```json
{
  "voiceToText": false,
  "myNewFeature": false
}
```

### Step 2: Use in components
```jsx
<FeatureGate feature="myNewFeature">
  <NewFeatureComponent />
</FeatureGate>
```

### Step 3: Test
1. Verify feature hidden when flag is `false`
2. Toggle flag to `true`
3. Verify feature visible when flag is `true`
4. Add telemetry if needed

## Future Enhancements

### User-specific flags
Store flag state in user preferences table:
```sql
ALTER TABLE users ADD COLUMN feature_flags JSONB DEFAULT '{}';
```

### Remote configuration
Fetch flags from backend API instead of static JSON:
```typescript
export async function fetchFeatures(): Promise<Record<string, boolean>> {
  const res = await fetch('/api/feature-flags');
  return res.json();
}
```

### A/B testing
Combine with user segments for gradual rollouts:
```typescript
export function hasFeature(key: FeatureKey, userId: string): boolean {
  if (key === 'voiceToText' && hashUserId(userId) % 100 < 10) {
    return true; // 10% rollout
  }
  return features[key];
}
```

### Telemetry integration
Track feature usage for data-driven decisions:
```typescript
export function hasFeature(key: FeatureKey): boolean {
  const enabled = Boolean(features[key]);
  if (enabled) {
    trackEvent('feature_used', { feature: key });
  }
  return enabled;
}
```

## Current Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `voiceToText` | `false` | Voice-to-text notes for tasks/projects |
| `hardDeleteProjects` | `false` | Permanent project deletion (vs soft-delete) |
| `includeArchivedToggle` | `true` | Show "Include archived" filter in lists |
| `rbacDevBanner` | `true` | Show dev auth role switcher banner |

## Success Metrics

✅ **Implemented** - Complete 3-layer feature flag system
✅ **Tested** - Toggle works with instant hot reload
✅ **Type-safe** - TypeScript prevents invalid feature names
✅ **Production-ready** - Simple, maintainable, extensible
✅ **Documented** - Clear usage examples and patterns

---

**Status:** ✅ **COMPLETE** - Feature flag system fully functional and tested!

**Mini lesson:** Keep flags coarse and named by capability ("voiceToText"), not by UI element ("showMicIcon"). When we wire the real voice-to-text feature, we'll drop it under this gate and add telemetry to measure usage before turning it on by default.
