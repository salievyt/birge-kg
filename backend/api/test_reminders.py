from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from core.models import Event, EventReminder, Notification
from .application.reminders import dispatch_event_reminders
from .application.services import EventService


class EventReminderTests(TestCase):
    def setUp(self):
        self.now = timezone.now()
        self.owner = User.objects.create_user('organizer')
        self.student = User.objects.create_user('attendee')
        self.event = Event.objects.create(organizer=self.owner, title='Workshop', location='Campus', starts_at=self.now + timedelta(minutes=45))
        self.event.attendees.add(self.student)
        self.reminder = EventReminder.objects.create(user=self.student, event=self.event)

    def test_due_reminder_delivered_once_including_after_toggle(self):
        self.assertEqual(dispatch_event_reminders(now=self.now)['delivered'], 1)
        self.assertEqual(dispatch_event_reminders(now=self.now)['delivered'], 0)
        self.assertFalse(EventService().toggle_reminder(self.event.id, self.student))
        self.assertTrue(EventService().toggle_reminder(self.event.id, self.student))
        self.assertEqual(dispatch_event_reminders(now=self.now)['delivered'], 0)
        notification = Notification.objects.get(user=self.student)
        self.assertEqual(notification.kind, 'event')
        self.assertIn('Campus', notification.body)

    def test_cancel_disables_reminder_and_requires_registration(self):
        EventService().cancel(self.event.id, self.student)
        self.reminder.refresh_from_db()
        self.assertFalse(self.reminder.enabled)
        self.assertEqual(dispatch_event_reminders(now=self.now)['delivered'], 0)
        with self.assertRaises(ValidationError):
            EventService().toggle_reminder(self.event.id, self.student)

    def test_rescheduled_event_gets_reminder_at_new_time(self):
        self.assertEqual(dispatch_event_reminders(now=self.now)['delivered'], 1)
        self.event.starts_at = self.now + timedelta(days=1)
        self.event.save()
        self.assertEqual(dispatch_event_reminders(now=self.now)['delivered'], 0)
        self.assertEqual(dispatch_event_reminders(now=self.event.starts_at - timedelta(minutes=30))['delivered'], 1)

    def test_past_far_future_and_inactive_users_are_skipped(self):
        for start in [self.now, self.now - timedelta(minutes=1), self.now + timedelta(hours=2)]:
            self.event.starts_at = start
            self.event.save()
            self.assertEqual(dispatch_event_reminders(now=self.now)['delivered'], 0)
        self.event.starts_at = self.now + timedelta(minutes=10)
        self.event.save()
        self.student.is_active = False
        self.student.save()
        self.assertEqual(dispatch_event_reminders(now=self.now)['delivered'], 0)

    def test_send_and_delivery_marker_roll_back_together(self):
        with patch.object(EventReminder, 'save', side_effect=RuntimeError('database failure')):
            with self.assertRaises(RuntimeError):
                dispatch_event_reminders(now=self.now)
        self.assertEqual(Notification.objects.count(), 0)
        self.reminder.refresh_from_db()
        self.assertIsNone(self.reminder.sent_for_start_at)
        self.assertEqual(dispatch_event_reminders(now=self.now)['delivered'], 1)

    @override_settings(REMINDER_JOB_SECRET='test-only-job-secret')
    def test_job_requires_bearer_secret_not_a_user_session(self):
        client = Client(enforce_csrf_checks=True)
        endpoint = '/api/jobs/event-reminders/'
        self.assertEqual(client.get(endpoint).status_code, 405)
        self.assertEqual(client.post(endpoint).status_code, 401)
        client.force_login(self.owner)
        self.assertEqual(client.post(endpoint).status_code, 401)
        self.assertEqual(client.post(endpoint, HTTP_AUTHORIZATION='Bearer wrong').status_code, 401)
        with patch('api.presentation.jobs.dispatch_event_reminders', return_value={'processed': 1, 'delivered': 1}):
            self.assertEqual(client.post(endpoint, HTTP_AUTHORIZATION='Bearer test-only-job-secret').json()['delivered'], 1)
        with override_settings(REMINDER_JOB_SECRET=''):
            self.assertEqual(client.post(endpoint).status_code, 503)
