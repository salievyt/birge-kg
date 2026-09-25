import uuid

from django.contrib.auth.models import User
from django.test import Client

from core.models import Project, ProjectMembership, ProjectMessage, ProjectChatRead
from .tests import AuthTestCase


class TeamChatTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.register('chat-member')
        self.member = User.objects.get(username='chat-member')
        self.owner = User.objects.create_user('chat-owner')
        self.project = Project.objects.create(owner=self.owner, title='Team', direction='IT')
        self.membership = ProjectMembership.objects.create(project=self.project, user=self.member, accepted=True, role='Developer')
        self.url = f'/api/projects/{self.project.id}/messages/'

    def send(self, text='Hello', client_id=None):
        return self.post(self.url, {'text': text, 'client_id': str(client_id or uuid.uuid4())})

    def test_member_and_owner_can_use_chat_without_exposing_it_in_comments(self):
        self.assertEqual(self.send().status_code, 201)
        self.client.force_login(self.owner)
        self.assertEqual(self.client.get(self.url).json()['results'][0]['text'], 'Hello')
        self.assertEqual(self.send('Owner message').status_code, 201)
        self.assertEqual(Client().get(f'/api/projects/{self.project.id}/comments/').json(), [])
        self.assertNotIn('Owner message', str(Client().get(f'/api/projects/{self.project.id}/').json()))

    def test_guests_outsiders_pending_and_nonmember_staff_cannot_read_or_write(self):
        self.assertIn(Client().get(self.url).status_code, [401, 403])
        self.membership.accepted = False
        self.membership.save()
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.send().status_code, 404)
        self.member.is_staff = True
        self.member.save()
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.post(self.url + 'read/', {'last_read_id': 1}).status_code, 404)

    def test_leaving_revokes_access(self):
        self.send()
        self.assertEqual(self.post(f'/api/projects/{self.project.id}/leave/', {}).status_code, 200)
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.send().status_code, 404)

    def test_retry_is_idempotent_and_changed_payload_conflicts(self):
        nonce = uuid.uuid4()
        first = self.send(client_id=nonce)
        second = self.send(client_id=nonce)
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        self.assertEqual(first.json()['id'], second.json()['id'])
        self.assertEqual(self.send('Different text', nonce).status_code, 409)
        self.assertEqual(ProjectMessage.objects.count(), 1)

    def test_paging_and_read_marker(self):
        ProjectMessage.objects.bulk_create([ProjectMessage(project=self.project, sender=self.owner, text=f'Message {i}', client_id=uuid.uuid4()) for i in range(60)])
        latest = self.client.get(self.url).json()
        self.assertEqual(len(latest['results']), 50)
        self.assertEqual(latest['unread'], 60)
        detail_url = f'/api/projects/{self.project.id}/'
        self.assertEqual(self.client.get(detail_url).json()['chat_unread'], 60)
        self.assertEqual(Client().get(detail_url).json()['chat_unread'], 0)
        older = self.client.get(self.url, {'before': latest['next_before']}).json()
        self.assertEqual(len(older['results']), 10)
        self.assertIsNone(older['next_before'])
        ids = [m['id'] for m in older['results'] + latest['results']]
        self.assertEqual(ids, sorted(set(ids)))
        self.assertEqual(self.post(self.url+'read/', {'last_read_id': ids[-1]}).status_code, 200)
        self.assertEqual(self.client.get(self.url).json()['unread'], 0)
        self.assertEqual(self.client.get(detail_url).json()['chat_unread'], 0)
        self.post(self.url+'read/', {'last_read_id': ids[0]})
        self.assertEqual(ProjectChatRead.objects.get(user=self.member).last_read_id, ids[-1])
        new = self.send('New').json()
        changes = self.client.get(self.url, {'after': ids[-1]}).json()
        self.assertEqual([m['id'] for m in changes['results']], [new['id']])

    def test_validation_csrf_and_cross_project_read_marker(self):
        self.assertEqual(self.send(' ').status_code, 400)
        self.assertEqual(self.send('x'*4001).status_code, 400)
        self.assertEqual(self.post(self.url, {'text': 'Hello', 'client_id': 'invalid'}).status_code, 400)
        self.assertEqual(self.client.post(self.url, {}, content_type='application/json').status_code, 403)
        self.assertEqual(self.client.get(self.url, {'after': -1}).status_code, 400)
        self.assertEqual(self.client.get(self.url, {'before': 1, 'after': 1}).status_code, 400)
        other = Project.objects.create(owner=self.owner, title='Other team', direction='IT')
        message = ProjectMessage.objects.create(project=other, sender=self.owner, text='Private', client_id=uuid.uuid4())
        self.assertEqual(self.post(self.url+'read/', {'last_read_id': message.id}).status_code, 404)
