# Design Tokens Quick Reference

## 🎨 Token-Driven Architecture

Eden ERP uses a **centralized design token system** where changing a single CSS variable updates the entire application instantly.

---

## 📍 Token Locations

### Primary Tokens
**File:** `apps/coordination_ui/src/index.css`

Contains Material Design variables:
- Colors (primary, success, warning, error, surface, background)
- Spacing (8px grid system)
- Border radius
- Shadows & elevation
- Transitions

### Secondary Tokens
**File:** `apps/coordination_ui/src/styles/tokens.css`

Contains additional theme variables for extended customization.

---

## 🔧 How to Use Tokens

### 1. **Change a Global Color**

**Example:** Update the primary brand color

```css
/* apps/coordination_ui/src/index.css */

:root {
  --md-primary: #10b981;  /* Changed from #1a73e8 to emerald */
}
```

**Result:** All primary buttons, links, focus states, and accents update instantly across **every page**.

---

### 2. **Adjust Spacing Scale**

**Example:** Increase card padding globally

```css
:root {
  --space-3: 32px;  /* Changed from 24px */
}
```

**Result:** All cards, sections, and components using `var(--space-3)` adjust automatically.

---

### 3. **Modify Border Radius**

**Example:** Make the UI more rounded

```css
:root {
  --radius-md: 12px;  /* Changed from 8px */
  --radius-lg: 16px;  /* Changed from 12px */
}
```

**Result:** All buttons, cards, inputs, and modals become more rounded.

---

### 4. **Update Shadow Depth**

**Example:** Softer elevation

```css
:root {
  --md-shadow-1: 0 1px 3px rgba(0,0,0,0.08);  /* Softer shadow */
}
```

**Result:** All cards and elevated components get a subtler shadow.

---

## 📖 In-App Documentation

Visit **`/styleguide`** in the app to see:

✅ Live color palette with CSS variable references  
✅ Typography scale examples  
✅ Spacing grid visualization  
✅ Border radius samples  
✅ Elevation system  
✅ Button styles  
✅ Status badges  
✅ Interactive "Show CSS" code snippets  

---

## 🧪 Testing Token Changes

1. **Open:** `apps/coordination_ui/src/index.css`
2. **Change:** `--md-primary: #1a73e8;` to `--md-primary: #10b981;`
3. **Save** and observe:
   - All primary buttons update
   - All links and active states change
   - Focus rings adjust
   - No component rewrites needed!

---

## 🎯 Available Token Categories

### Colors
- `--md-primary` - Brand color (buttons, links)
- `--md-success` - Success states
- `--md-warning` - Warning states
- `--md-error` - Error states
- `--md-surface` - Card backgrounds
- `--md-background` - Page background

### Spacing (8px Grid)
- `--space-1` = 8px
- `--space-2` = 16px
- `--space-3` = 24px
- `--space-4` = 32px
- `--space-5` = 40px
- `--space-6` = 48px

### Border Radius
- `--radius-sm` = 4px
- `--radius-md` = 8px
- `--radius-lg` = 12px
- `--radius-xl` = 16px

### Shadows
- `--md-shadow-1` - Level 1 elevation (cards)
- `--md-shadow-2` - Level 2 elevation (hover)
- `--md-shadow-3` - Level 3 elevation (modals)
- `--md-shadow-4` - Level 4 elevation (dialogs)

### Transitions
- `--transition-fast` = 150ms
- `--transition-base` = 250ms
- `--transition-slow` = 350ms

---

## 💡 Benefits

✅ **Single Source of Truth** - One file controls all visual styles  
✅ **Instant Updates** - Change propagates across entire app  
✅ **No Component Rewrites** - All components reference tokens  
✅ **Theme Consistency** - Impossible to have mismatched colors  
✅ **Easy Rebranding** - Update 5 variables, rebrand entire app  

---

## 🚀 Best Practices

1. **Always use CSS variables** - Never hardcode colors/spacing
2. **Reference tokens in new components** - `color: var(--md-primary)`
3. **Test changes in Styleguide first** - See all tokens in one place
4. **Document custom tokens** - Add new tokens to this guide

---

## 📚 Related Pages

- **Styleguide:** `/styleguide` - Live token showcase
- **UI Contract:** `docs/ui-contract.yaml` - Page coverage
- **Replit Docs:** `replit.md` - Project architecture

---

*Last updated: October 26, 2025*
