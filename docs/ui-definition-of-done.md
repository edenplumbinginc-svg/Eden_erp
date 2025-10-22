# UI Definition of Done (Soft Light Shell)

For any screen, ALL must be true before merging:
1) Loads in <1s on dev (first paint) — measured once per day.
2) Empty state present and readable (no console errors).
3) Error state present and readable (API down or 4xx).
4) One read slice + one write action + one inline control:
   - Example: list → create → status dropdown (optimistic).
5) Keyboard support: Enter submits, Tab order sane, visible focus ring.
6) Activity/audit visible for any auto-action that changes data.

If any item fails → not done.

## Micro-UX tokens (don't violate without reason)
- Radius: rounded-2xl (20px). 
- Shadow: soft (low contrast).
- Motion: 150–200ms ease-out; no hard color jumps.
- Brand color usage: sparing (primary actions only).

