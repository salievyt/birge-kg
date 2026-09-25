# Deployment notes

## Database and images

Set `DATABASE_URL` to the Neon pooled connection string in the backend project's
Production environment. Run `python manage.py migrate --noinput` at build time.
Migration 0004 adds club rejection state and persistent image storage.
Migration 0006 adds event report text and photo URLs. Apply all pending migrations
before serving the updated frontend.
Migration 0007 adds private team messages and read markers. Team chat uses ordinary
authenticated HTTP requests and five-second polling while the page is visible;
it does not require a persistent WebSocket worker. Restrict and monitor message
traffic before wider public rollout; comprehensive abuse throttling is pending.

New images (PNG, JPEG, GIF, WebP, maximum 3 MiB and 20 million pixels) are stored
in PostgreSQL and served at `/api/media/<uuid>/`. SVG is not accepted. Existing
URLs in content remain unchanged; images previously saved to an ephemeral
filesystem must be uploaded again. The database storage is intended for a small
community, not a video library.

## Password recovery email

Configure these backend environment variables using your email provider:

| Variable | Meaning |
| --- | --- |
| `EMAIL_HOST` | SMTP server |
| `EMAIL_PORT` | SMTP port, default 587 |
| `EMAIL_HOST_USER` | SMTP account |
| `EMAIL_HOST_PASSWORD` | SMTP password or provider app password (secret) |
| `EMAIL_USE_TLS` | 1 for STARTTLS, default 1 |
| `EMAIL_USE_SSL` | 1 for implicit TLS (usually port 465), disables STARTTLS |
| `DEFAULT_FROM_EMAIL` | Verified sender, e.g. BIRGE <noreply@your-domain> |
| `FRONTEND_URL` | https://birge.deo-core.codes |

No messages are sent until SMTP is configured. The reset form reports that
delivery is unavailable rather than claiming to have sent a message. Configure
the sender's domain in the email provider as required and redeploy after setting
environment variables. Recovery links expire after one hour and are invalidated
when the password changes. Public profiles do not include email. Existing users
can add an email in their profile by confirming their current password.

For sustained abuse protection, configure a shared Django cache or edge rate
limiting for auth endpoints. The per-process reset throttle is only best-effort
across Vercel instances.

## Scheduled event reminders

Migration 0005 adds enabled/delivery state to event reminders. Run a trusted
scheduler every five minutes, either executing `python manage.py send_event_reminders`
or sending POST to `/api/jobs/event-reminders/` with header
`Authorization: Bearer <REMINDER_JOB_SECRET>`. Set a long random secret only on
the backend and scheduler, never in frontend configuration or URLs.

This job creates in-app notifications within one hour before the event. It does
not send email or push notifications. Each batch handles at most 500 reminders;
monitor processed/delivered counts and increase worker frequency for larger loads.
Retries are idempotent for a given scheduled start. Cancellation disables the
reminder, and a changed event start becomes eligible for a new reminder.

No production scheduler has been connected yet. The endpoint returns 503 when
its secret is absent, and session login does not authorize job execution.

## Local checks

Run isolated tests without connecting to the production database:

```sh
DATABASE_URL='' python manage.py test api --noinput
```

Production must have a unique secret `DJANGO_SECRET_KEY` and `DJANGO_DEBUG=0`.
