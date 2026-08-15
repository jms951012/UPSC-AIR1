UPSC Active Recall Engine V4 — Independent Question Banks

Changes:
1. Every imported JSON file is stored as a NEW independent question bank.
2. Imports are never merged by subject, chapter, bank name, or question ID.
3. Question IDs are namespaced when an imported file would collide with an existing question ID.
4. Home screen displays each imported JSON as a separate bank card.
5. Open a bank to Test Entire Question Bank, view topics, Rename, or Delete it.
6. Rename changes the bank name shown inside the PWA; it does not rename the original JSON file on your phone.
7. Delete removes only that bank and its question statistics/bookmarks from the PWA. The original JSON/GitHub copy is untouched.
8. Backup format upgraded to V4.

Recommended migration:
- Export a backup from the old engine if you have important progress.
- Deploy this V4 build.
- Re-import the original JSON files one by one. Each becomes its own independent bank.
- If an old merged bank exists, delete it after confirming the separate banks are present.
