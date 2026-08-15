UPSC ACTIVE RECALL ENGINE V3.4 — DELETE FINAL FIX

This package fixes the chapter/question-bank delete action.

FIX:
- Replaced browser confirm/alert flow with an in-app confirmation modal.
- Delete action is bound to the exact Subject + Chapter currently open.
- Deletes the selected bank(s) from IndexedDB.
- Removes related per-question statistics and bookmarks.
- Saves all changes before navigating home.
- Shows a success/failure message inside the app.
- Added cache-busting app.js?v=34.
- Service-worker cache name bumped to V3.4 so the old cached V3.3 code is not reused.

NOT DELETED:
- Original JSON file on the phone.
- GitHub repository files.
- Other question banks.

Use this ZIP in the SAME GitHub repository. Do not create a new repository.
After GitHub Pages updates, open the same URL and refresh once if necessary.
