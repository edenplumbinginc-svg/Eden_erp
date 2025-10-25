# Config Bug Fixes - lib/config.js

## Summary
Fixed two critical bugs in `lib/config.js` identified during architect review.

## Bug 1: coerceBool breaks defaults

### Problem
- Converting missing/undefined env vars to string `"undefined"`
- This caused Zod validation to fail instead of applying defaults
- Defaults were being applied as strings, not booleans

### Solution
Refactored `coerceBool` to accept a default parameter (like `coerceInt` does):

```javascript
const coerceBool = (def = undefined) => z.preprocess(
  v => {
    if (v == null || v === '' || v === 'undefined') {
      return def; // Return default if provided, otherwise undefined
    }
    return String(v).trim().toLowerCase();
  },
  def === undefined ? z.enum(["true","false"]).optional() : z.enum(["true","false"])
).transform(v => v === "true");
```

Usage changed from:
```javascript
ESCALATION_WORKER_ENABLED: coerceBool.default("false"),
```

To:
```javascript
ESCALATION_WORKER_ENABLED: coerceBool("false"),
```

### Result
- Missing env vars now correctly use defaults as booleans
- `ESCALATION_WORKER_ENABLED` = `false` (boolean, not string)
- `ESC_DRY_RUN` = `true` (boolean, not string)

## Bug 2: Unknown key detection creates noise

### Problem
- Flagged ALL uppercase env vars not in the known set
- Created false positives for standard OS vars (PATH, HOME, PWD, USER, SHELL)
- Made logs noisy and confusing

### Solution
Filter unknown key detection to only check relevant prefixes:

```javascript
// Only check keys with relevant prefixes
const relevantPrefixes = ['ESC_', 'OPS_', 'SLACK_', 'APP_', 'SENTRY_', 'ESCALATION_', 'DATABASE_', 'NODE_ENV'];
const unknown = Object.keys(env).filter(k => {
  if (!k.match(/^[A-Z][A-Z0-9_]*$/)) return false; // Must be uppercase with underscores
  if (known.has(k)) return false; // Already validated
  // Only flag keys starting with relevant prefixes
  return relevantPrefixes.some(prefix => k.startsWith(prefix));
});
```

### Result
- Standard OS vars (PATH, HOME, PWD, SHELL, etc.) no longer trigger warnings
- Typos in app-specific keys still detected (e.g., "ESC_DRY_RU" instead of "ESC_DRY_RUN")
- Clean startup logs with only relevant warnings

## Testing

Created comprehensive test suite in `scripts/test-config-bugs.js`:

### Test 1: Missing boolean env vars use defaults ✅
```
ESCALATION_WORKER_ENABLED: false (boolean)
ESCALATION_V1: false (boolean)
ESC_DRY_RUN: true (boolean)
```

### Test 2: Standard OS vars ignored ✅
```
No warnings for: PATH, HOME, PWD, USER, SHELL, LANG
```

### Test 3: Typos in relevant keys detected ✅
```
Warning: Unknown env keys: ESC_DRY_RU, ESCALATION_WORKR_ENABLED
```

## Verification

- ✅ Server starts successfully with missing boolean env vars
- ✅ No false warnings about OS environment variables
- ✅ Still catches typos in app-specific configuration
- ✅ Backend workflow restarted successfully
- ✅ All test scripts pass

## Files Modified

1. `lib/config.js` - Core fixes for both bugs
2. `scripts/test-config-bugs.js` - Comprehensive test suite
3. `scripts/verify-config-fixes.js` - Final verification script
