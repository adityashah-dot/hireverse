# IS-F05: Notifications Page Mock Data

**Status:** ✅ Fixed
**Severity:** 🟡 Half-Baked
**Source:** AUDIT_REPORT.md #6
**Fixed:** May 2026

## Issue
Notifications page used hardcoded notification objects with no connection to `ActivityLog` in the database. Marking as read, deleting, and filtering operated on in-memory state resetting on page refresh.

## Fix
Page now fetches from `/api/activity`. Uses `activityToNotification()` mapper to convert `ActivityLog` entries to notification objects. Real data from the database.
