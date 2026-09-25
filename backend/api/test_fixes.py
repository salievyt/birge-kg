from datetime import timedelta
from unittest.mock import patch
from urllib.parse import urlsplit, parse_qs

from django.contrib.auth.models import User
from django.core import mail
from django.test import Client, override_settings
from django.utils import timezone
from core.models import Club, Project, Idea, Event
from .tests import AuthTestCase


class ContentTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.register('author')
        self.user = User.objects.get(username='author')

    def test_student_creates_all_content_with_server_owner(self):
        project = self.post('/api/projects/', {'title': 'New', 'description': 'Text', 'direction': 'IT', 'owner': 999})
        self.assertEqual(project.status_code, 201)
        self.assertEqual(project.json()['owner']['id'], self.user.id)
        idea = self.post('/api/ideas/', {'title': 'Idea', 'description': 'Text', 'status': 'approved', 'votes': 99, 'official_response': 'Fake'})
        self.assertEqual(idea.status_code, 201)
        self.assertEqual(idea.json()['author']['id'], self.user.id)
        self.assertEqual(idea.json()['status'], 'review')
        self.assertEqual(idea.json()['votes'], 0)
        self.assertEqual(idea.json()['official_response'], '')
        event = self.post('/api/events/', {'title': 'Event', 'description': 'Text', 'starts_at': (timezone.now() + timedelta(days=2)).isoformat(), 'location': 'Campus'})
        self.assertEqual(event.status_code, 201)
        self.assertEqual(event.json()['organizer']['id'], self.user.id)

    def test_other_student_cannot_edit_or_delete(self):
        other = User.objects.create_user('other')
        project = Project.objects.create(owner=other, title='Protected', description='Text', direction='IT')
        url = f'/api/projects/{project.id}/'
        self.assertEqual(self.client.patch(url, {'title': 'Hijack'}, content_type='application/json', HTTP_X_CSRFTOKEN=self.csrf).status_code, 403)
        self.assertEqual(self.client.delete(url, HTTP_X_CSRFTOKEN=self.csrf).status_code, 403)

class NotificationTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.register('notification-reader')
        self.user = User.objects.get(username='notification-reader')

