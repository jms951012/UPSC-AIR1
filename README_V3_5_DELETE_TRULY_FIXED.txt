V3.5 DELETE FIX

The previous delete bug was caused by relying only on bank-level chapter metadata. Some imported banks store the chapter only in individual questions or use bank_name instead of name. V3.5 matches both bank-level and question-level metadata and removes the exact Subject + Chapter bank.

It also uses network-first fetching for app.js/sw.js to prevent a stale service-worker copy from masking updates.
