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

    def test_club_moderation_hides_all_public_paths(self):
        created = self.post('/api/clubs/', {'name': 'Pending', 'category': 'IT', 'description': 'Text', 'is_moderated': True})
        self.assertEqual(created.status_code, 201)
        club_id = created.json()['id']
        self.assertFalse(created.json()['is_moderated'])
        public = Client()
        self.assertEqual(public.get('/api/clubs/').json()['count'], 0)
        self.assertEqual(public.get(f'/api/clubs/{club_id}/').status_code, 404)
        self.assertEqual(public.get(f'/api/clubs/{club_id}/comments/').status_code, 404)
        self.assertEqual(self.post(f'/api/clubs/{club_id}/join/', {}).status_code, 400)
        self.assertEqual(self.post('/api/favorites/', {'resource_type': 'club', 'resource_id': club_id}).status_code, 400)
        self.assertEqual(self.post('/api/moderation/decide/', {'resource': 'clubs', 'resource_id': club_id, 'action': 'approve'}).status_code, 403)
        self.user.is_staff = True
        self.user.save()
        self.assertEqual(self.post('/api/moderation/decide/', {'resource': 'clubs', 'resource_id': club_id, 'action': 'approve'}).status_code, 200)
        self.assertEqual(public.get('/api/clubs/').json()['count'], 1)
        self.assertEqual(public.get(f'/api/clubs/{club_id}/').status_code, 200)

    def test_rejected_club_exits_queue_and_stays_hidden(self):
        club = Club.objects.create(lead=self.user, name='Reject', category='IT', description='Text')
        self.user.is_staff = True
        self.user.save()
        self.assertEqual(self.post('/api/moderation/decide/', {'resource': 'clubs', 'resource_id': club.id, 'action': 'reject'}).status_code, 200)
        self.assertEqual(self.client.get('/api/moderation/').json()['clubs'], [])
        self.assertEqual(Client().get('/api/clubs/').json()['count'], 0)

    def test_pending_club_visible_only_to_owner_and_moderator(self):
        club = Club.objects.create(lead=self.user, name='Private draft', category='IT', description='Text', is_rejected=True)
        url = f'/api/clubs/{club.id}/'
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertTrue(self.client.get(url).json()['is_owner'])
        outsider = User.objects.create_user('club-outsider')
        self.client.force_login(outsider)
        self.assertEqual(self.client.get(url).status_code, 404)
        outsider.is_staff = True
        outsider.save()
        self.assertEqual(self.client.get(url).status_code, 200)
        self.client.force_login(self.user)
        edited = self.client.patch(url, {'description': 'Revised', 'is_moderated': True}, content_type='application/json', HTTP_X_CSRFTOKEN=self.csrf)
        self.assertEqual(edited.status_code, 200)
        club.refresh_from_db()
        self.assertFalse(club.is_rejected)
        self.assertFalse(club.is_moderated)
        self.assertEqual(Client().get(url).status_code, 404)

    def test_upload_rejects_fake_image_and_svg(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        for name in ['fake.png', 'script.svg']:
            response = self.client.post('/api/upload/', {'file': SimpleUploadedFile(name, b'not an image')}, HTTP_X_CSRFTOKEN=self.csrf)
            self.assertEqual(response.status_code, 400)

class NotificationTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.register('notification-reader')
        self.user = User.objects.get(username='notification-reader')

class PasswordTests(AuthTestCase):
    def test_email_reset_changes_password_and_cannot_be_replayed(self):
        user = User.objects.create_user('reset-user', email='reset@example.com', password='Old-strong-547!')
        response = self.post('/api/auth/password-reset/', {'email': user.email})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        link = next(line for line in mail.outbox[0].body.splitlines() if line.startswith('https://'))
        query = parse_qs(urlsplit(link).fragment.split('?')[1])
        payload = {'uid': query['uid'][0], 'token': query['token'][0], 'password': 'New-strong-9138!'}
        response = self.post('/api/auth/password-reset-confirm/', payload)
        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password(payload['password']))
        self.assertEqual(self.post('/api/auth/password-reset-confirm/', payload).status_code, 400)
        missing = self.post('/api/auth/password-reset/', {'email': 'missing@example.com'})
        self.assertEqual(missing.json(), self.post('/api/auth/password-reset/', {'email': user.email}).json())

    def test_invalid_and_expired_reset(self):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        user = User.objects.create_user('expiry', password='Old-strong-547!')
        token = default_token_generator.make_token(user)
        payload = {'uid': urlsafe_base64_encode(force_bytes(user.pk)), 'token': token, 'password': 'New-strong-9138!'}
        with override_settings(PASSWORD_RESET_TIMEOUT=-1):
            self.assertEqual(self.post('/api/auth/password-reset-confirm/', payload).status_code, 400)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend', EMAIL_HOST='')
    def test_missing_mail_configuration_is_reported(self):
        self.assertEqual(self.post('/api/auth/password-reset/', {'email': 'test@example.com'}).status_code, 503)

    def test_email_private_and_requires_password_to_change(self):
        response = self.post('/api/auth/register/', {'username': 'private-mail', 'first_name': 'Test', 'password': 'Test-strong-9138!', 'email': 'private@example.com'})
        self.csrf = response.json()['csrf']
        self.assertEqual(response.json()['account']['profile']['email'], 'private@example.com')
        self.assertNotIn('email', str(Client().get('/api/profiles/').json()))
        self.assertEqual(self.patch_me({'email': 'next@example.com'}).status_code, 400)
        self.assertEqual(self.patch_me({'email': 'next@example.com', 'current_password': 'Test-strong-9138!'}).status_code, 200)
