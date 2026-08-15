UPSC Active Recall Engine V3.3 — Delete Fix

Fixed:
- Chapter delete button now has a real IndexedDB delete handler.
- Deletes the selected Subject → Chapter question bank from the PWA's local database.
- Removes associated per-question stats and bookmarks.
- Does NOT delete the original JSON file on the phone.
- Does NOT delete anything from GitHub.
- Includes a confirmation dialog before deletion.
- If deletion fails, the app shows the actual error instead of appearing stuck.
- Option display remains A/B/C/D and option-analysis handling remains compatible with imported banks.

Existing question banks in this package are preserved.
