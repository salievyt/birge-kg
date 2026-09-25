# BIRGE verification and remaining scope

This is a delivery checklist, not a claim that the platform is complete.
Local checks do not establish production readiness. Preserve the full platform
scope from the original brief when choosing subsequent work.

## Verified locally

- Student-owned creation and editing of projects, ideas, clubs and events.
- Project applications remain pending until approved by the project owner.
- Project status and progress editing, including a browser save-and-reload check.
- Clubs remain hidden until approved; owners can read and revise rejected clubs.
- Catalog pagination and search; mixed favorites retain their resource type.
- Combined project status/direction/role filters and people faculty/specialty/
  skill/interest/availability filters; private-profile exclusion covered by tests.
- Notification pagination and server-side category filtering, with ownership tests
  for individual and bulk read actions.
- Profile email is private and requires the current password to change.
- Password recovery token expiry and single use, using an in-memory test mailbox.
- Persistent image records and image validation; local migration applied.
- Forms inspected at 320 px and 390 px; not every screen/device is verified.

Evidence: `backend/api/tests.py`, `backend/api/test_fixes.py`, TypeScript checking,
and local browser checks. These tests do not replace PostgreSQL concurrency or
production integration testing.

## Current increment

- Moderator-only official replies and idea status changes on the detail screen.
- Author notifications for official replies and idea/club decisions.
- Server coverage includes ordinary-user restrictions and public reply visibility.
- In-app event reminder dispatcher, authenticated scheduler endpoint and management
  command. Delivery/cancellation/rescheduling/rollback covered locally. Production
  scheduling is still not connected; PostgreSQL concurrency remains to be verified.
- Event reports with text, materials link and up to 12 photos. Organizer/moderator
  permissions and validation covered by tests; text publication verified in the
  local browser. Photo upload/gallery needs a complete browser verification.
- Private project team chat with bounded cursor history, polling, read markers,
  retry-safe sending and membership checks. Local browser sending verified.
  Guest, pending-member, nonmember moderator and departed-member access covered.

## Remaining acceptance work

1. Overview: verify recommendation relevance and the complete latest-activity feed.
2. Profile: audit privacy across every listing, achievement and membership surface;
   verify notification preferences are respected by every producer.
3. Projects: complete team invitations and their acceptance/decline flow; validate
   concurrent decisions on PostgreSQL and owner/member counts across screens.
4. Ideas: verify moderator reply UI in a real moderator session; define and test
   the finished-implementation state without losing existing status history.
5. Clubs: verify associated events, membership flow, moderation feedback and editing
   of already-approved clubs as a complete user journey.
6. Events: connect and verify production scheduled reminders and photo-report upload;
   verify timezone boundaries, capacity changes and concurrent registrations.
7. People: verify all requested filters and direct contact/invitation flows.
8. Messages: add a conversation inbox/direct-contact flow and verify multiple live
   clients, reconnection, pagination scroll position, message abuse limits and
   PostgreSQL concurrency. Team chat exists; this is not full messaging completion.
9. Administration: finish user management, official announcements and activity
   analytics; audit permissions on every administrative mutation.
10. UX: run end-to-end student/moderator/guest journeys, keyboard and focus checks,
    loading/error/retry states, empty states, and desktop/tablet/mobile screenshots.
11. Operations: configure real email delivery with a verified sender; verify shared
    auth rate limiting, production secrets, image delivery and database migrations.
12. Delivery: resolve the Next.js optional-dependency lockfile warning, inspect the
    release diff, deploy both applications, and verify the actual public domains.

## Operational constraints

- Use `DATABASE_URL=''` for local tests and development. The local `.env` can point
  to production Neon; never seed test users or test content there.
- SMTP is not configured. Real password-recovery delivery is not verified.
- The latest changes are local, not published to Vercel.
- Rotate the database password previously shared in the conversation through the
  provider and update deployment secrets; do not commit credentials.
