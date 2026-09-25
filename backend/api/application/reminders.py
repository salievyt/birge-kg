from datetime import timedelta

from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from core.models import Event, EventReminder, Notification


def dispatch_event_reminders(*, now=None, limit=500):
    """Deliver one in-app reminder per user and scheduled start, in bounded batches."""
    now = now or timezone.now()
    due = EventReminder.objects.filter(
        enabled=True, user__is_active=True,
        event__starts_at__gt=now, event__starts_at__lte=now + timedelta(hours=1),
    ).filter(Q(sent_for_start_at__isnull=True) | ~Q(sent_for_start_at=F("event__starts_at")))
    candidates = list(due.order_by("event__starts_at", "id").values_list("id", "event_id")[:limit])
    delivered = 0
    for reminder_id, event_id in candidates:
        with transaction.atomic():
            # Registration, cancellation and dispatch take the same event lock first.
            event = Event.objects.select_for_update().filter(pk=event_id).first()
            if event is None or not now < event.starts_at <= now + timedelta(hours=1):
                continue
            reminder = EventReminder.objects.select_for_update().filter(
                pk=reminder_id, enabled=True, user__is_active=True,
            ).first()
            if reminder is None or reminder.sent_for_start_at == event.starts_at:
                continue
            if not event.attendees.filter(pk=reminder.user_id).exists():
                reminder.enabled = False
                reminder.save(update_fields=["enabled"])
                continue
            local_start = timezone.localtime(event.starts_at)
            Notification.objects.create(
                user_id=reminder.user_id, kind="event", title="Мероприятие скоро начнётся",
                body=f"«{event.title}»: {local_start:%d.%m.%Y в %H:%M %Z}. Место: {event.location}.",
            )
            reminder.sent_for_start_at = event.starts_at
            reminder.save(update_fields=["sent_for_start_at"])
            delivered += 1
    return {"processed": len(candidates), "delivered": delivered}
