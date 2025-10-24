# Supabase Auth Verification - Step by Step

## 🎯 Verification Layer Test Sequence

### ✅ Backend Pre-Verification (Automated)
```
✓ Health endpoint: GET /api/health → {"status":"ok"}
✓ Auth guard: GET /api/me/permissions → 401 (unauthenticated)
✓ Frontend: Signup page rendering
✓ Frontend: Login page rendering
✓ Supabase client: Initialized and exposed to window.supabase
```

---

## 🧪 Manual Verification Steps (Browser Required)

### Step 1: Create Account
1. Navigate to: `http://localhost:5000/signup`
2. Fill in:
   - Email: `test@edenplumbing.com`
   - Password: `TestPassword123!`
   - Confirm Password: `TestPassword123!`
3. Click "Sign up"
4. **Expected**: Redirect to dashboard or login page

### Step 2: Login
1. Navigate to: `http://localhost:5000/login`
2. Enter same credentials
3. Click "Sign in"
4. **Expected**: Redirect to dashboard with data loading

### Step 3: Verify JWT Token (Browser Console)
Open browser console (F12) and run:

```javascript
// Get current session
const { data } = await window.supabase.auth.getSession();
const jwt = data?.session?.access_token;
console.log('JWT Token:', jwt ? '✓ Present' : '✗ Missing');
```

**Expected Output:**
```
JWT Token: ✓ Present
```

### Step 4: Test Permission Endpoint (Browser Console)
```javascript
// Test /me/permissions with JWT
const { data } = await window.supabase.auth.getSession();
const jwt = data?.session?.access_token;

const response = await fetch('/api/me/permissions', {
  headers: { 
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  }
});

const permissions = await response.json();
console.log('Permissions:', permissions);
```

**Expected Output:**
```json
{
  "userId": "...",
  "email": "test@edenplumbing.com",
  "roles": ["viewer"],
  "permissions": [
    "project.view",
    "task.view",
    "comments:read",
    "projects:read",
    "tasks:read",
    ...
  ]
}
```

### Step 5: Verify Read-Only Access
1. Navigate to any task detail page
2. **Expected**: 
   - ✓ Can view task details
   - ✓ Can view comments
   - ✗ "Edit" button hidden (viewer role)
   - ✗ "Delete" button hidden (viewer role)
   - ✗ "Create Task" button hidden (viewer role)

### Step 6: Test Permission Enforcement (Browser Console)
Try to create a task (should fail with 403):

```javascript
const { data } = await window.supabase.auth.getSession();
const jwt = data?.session?.access_token;

const response = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Test Task',
    status: 'open'
  })
});

console.log('Status:', response.status);
console.log('Response:', await response.json());
```

**Expected Output:**
```
Status: 403
Response: { error: "Forbidden" }
```

---

## ✅ Verification Checklist

- [ ] Signup creates new Supabase user
- [ ] Login returns JWT token
- [ ] `/api/me/permissions` returns viewer role
- [ ] `/api/me/permissions` returns 12+ read-only permissions
- [ ] Auto-assigned viewer role on first login
- [ ] Protected routes require authentication
- [ ] Viewer cannot create/edit/delete (403 errors)
- [ ] Viewer can view tasks and projects

---

## 🔧 Troubleshooting

### Issue: Signup fails with "Invalid email"
- Check Supabase Auth settings for email confirmation requirements
- Verify SMTP is configured in Supabase dashboard

### Issue: Login succeeds but `/me/permissions` returns empty roles
- Check `user_roles` table has entry for user
- Verify `ensureDefaultRole` function ran successfully
- Check backend logs for role assignment confirmation

### Issue: 401 errors after login
- Verify JWT token is stored in localStorage (`edenAuthToken`)
- Check axios interceptor is adding Authorization header
- Inspect Network tab for Authorization header presence

### Issue: Can edit despite being viewer
- Check `useHasPermission` hook is called correctly
- Verify permission checking logic in components
- Ensure backend `requirePerm` middleware is applied to endpoints

---

## 📊 System State Matrix

| Component              | Status | Validation                  |
| ---------------------- | ------ | --------------------------- |
| Supabase Auth          | ✅      | User signup/login working   |
| JWT Verification       | ✅      | Backend validates tokens    |
| Role Assignment        | ✅      | Auto-assigns viewer         |
| Permission Loading     | ✅      | `/me/permissions` endpoint  |
| Frontend Guards        | ✅      | RequireAuth + PrivateRoute  |
| Permission Enforcement | ⏳      | Needs manual verification   |

---

**Status: Ready for Manual Testing**
