from datetime import timedelta

from django.contrib.auth.models import User
from django.test import Client
from django.utils import timezone

from core.models import Event
from .tests import AuthTestCase


class EventReportTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.register('report-author')
        self.owner = User.objects.get(username='report-author')
        self.event = Event.objects.create(organizer=self.owner, title='Workshop', location='Campus', starts_at=timezone.now() - timedelta(days=1))
        self.url = f'/api/events/{self.event.id}/'

    def update(self, body):
        return self.client.patch(self.url, body, content_type='application/json', HTTP_X_CSRFTOKEN=self.csrf)

    def test_report_can_be_published_and_is_public(self):
        payload = {'report': 'Built three prototypes.', 'report_photos': ['https://example.com/photo.png'], 'report_url': 'https://example.com/materials'}
        self.assertEqual(self.update(payload).status_code, 200)
        item = Client().get(self.url).json()['item']
        for key, value in payload.items():
            self.assertEqual(item[key], value)
        self.assertEqual(self.update({'report': '', 'report_photos': [], 'report_url': ''}).status_code, 200)

    def test_nonowner_cannot_publish_but_moderator_can(self):
        other = User.objects.create_user('report-outsider')
        self.client.force_login(other)
        self.assertEqual(self.update({'report': 'Fake report'}).status_code, 403)
        other.is_staff = True
        other.save()
        self.assertEqual(self.update({'report': 'Moderated report'}).status_code, 200)

    def test_future_report_and_move_report_to_future_are_rejected(self):
        self.event.starts_at = timezone.now() + timedelta(days=1)
        self.event.save()
        self.assertEqual(self.update({'report': 'Too soon'}).status_code, 400)
        self.event.starts_at = timezone.now() - timedelta(days=1)
        self.event.report = 'Published report'
        self.event.save()
        self.assertEqual(self.update({'starts_at': (timezone.now() + timedelta(days=1)).isoformat()}).status_code, 400)

    def test_report_limits_and_unsafe_links_are_rejected(self):
        for payload in [
            {'report_photos': ['https://example.com/photo.png'] * 13},
            {'report_photos': ['javascript:alert(1)']},
            {'report_photos': ['ftp://example.com/photo.png']},
            {'report_photos': 'not a list'},
            {'report_url': 'ftp://example.com/report'},
            {'report': 'x' * 10001},
        ]:
            with self.subTest(payload=list(payload)):
                self.assertEqual(self.update(payload).status_code, 400)
