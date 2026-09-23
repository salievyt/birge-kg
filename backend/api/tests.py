from django.contrib.auth.models import User, Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, Client
from core.models import Club, Event, Idea, Profile, Project


class AuthTestCase(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.csrf = self.client.get('/api/auth/session/').json()['csrf']

    def post(self, path, data):
        return self.client.post(path, data, content_type='application/json', HTTP_X_CSRFTOKEN=self.csrf)

    def register(self, username, first_name='Student', password='Test-strong-9138!'):
        response = self.post('/api/auth/register/', {'username': username, 'first_name': first_name, 'password': password})
        self.csrf = response.json()['csrf']
        return response

    def patch_me(self, data):
        return self.client.patch('/api/auth/me/', data, content_type='application/json', HTTP_X_CSRFTOKEN=self.csrf)


class AccountTests(AuthTestCase):
    def test_registration_session_profile_and_logout(self):
        response = self.post('/api/auth/register/', {'username': 'student_test', 'first_name': 'Student', 'password': 'Test-strong-9138!'} )
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.json()['account']['can_moderate'])
        self.csrf = response.json()['csrf']
        self.assertTrue(User.objects.get(username='student_test').check_password('Test-strong-9138!'))
        response = self.client.patch('/api/auth/me/', {'faculty': 'IT', 'course': 3, 'privacy_level': 'private'}, content_type='application/json', HTTP_X_CSRFTOKEN=self.csrf)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['profile']['course'], 3)
        self.assertEqual(self.client.get('/api/moderation/').status_code, 403)
        self.assertEqual(self.post('/api/auth/logout/', {}).status_code, 200)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        self.assertEqual(self.client.get('/api/profiles/').json()['count'], 0)

    def test_csrf_and_password_validation(self):
        self.assertEqual(self.client.post('/api/auth/register/', {}, content_type='application/json').status_code, 403)
        self.assertEqual(self.post('/api/auth/register/', {'username': 'test', 'first_name': 'Test', 'password': '123'}).status_code, 400)

    def test_login_and_moderator(self):
        user = User.objects.create_user(username='moderator', password='Strong-8174!')
        user.groups.add(Group.objects.create(name='Moderators'))
        self.assertEqual(self.post('/api/auth/login/', {'username': 'moderator', 'password': 'wrong'}).status_code, 400)
        response = self.post('/api/auth/login/', {'username': 'moderator', 'password': 'Strong-8174!'})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['account']['can_moderate'])
        self.assertEqual(self.client.get('/api/moderation/').status_code, 200)

    def test_public_cannot_modify_content(self):
        self.assertEqual(self.post('/api/projects/', {'title': 'Unauthorized'}).status_code, 403)

    def test_dashboard_stats(self):
        Project.objects.create(title='P', description='D', direction='IT', owner=User.objects.create_user(username='owner', password='Strong-8174!'))
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['stats']['projects'], 1)
        self.assertIn('activity', payload)
        self.assertIn('top_faculties', payload)
        self.assertIn('directions', payload)

    def test_upload_requires_moderator_and_stores_file(self):
        response = self.client.post('/api/upload/', {})
        self.assertEqual(response.status_code, 403)
        user = User.objects.create_user(username='moderator_upload', password='Strong-8174!')
        user.groups.add(Group.objects.create(name='Moderators'))
        uploader = Client(enforce_csrf_checks=True)
        csrf = uploader.get('/api/auth/session/').json()['csrf']
        login = uploader.post('/api/auth/login/', {'username': 'moderator_upload', 'password': 'Strong-8174!'}, content_type='application/json', HTTP_X_CSRFTOKEN=csrf)
        csrf = login.json()['csrf']
        response = uploader.post('/api/upload/', {'file': SimpleUploadedFile('logo.png', b'fake-png')}, HTTP_X_CSRFTOKEN=csrf)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['url'].startswith('http://testserver/media/'))


class FeatureTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.owner = User.objects.create_user(username='owner_user', first_name='Owner', password='Strong-8174!')
        self.project = Project.objects.create(owner=self.owner, title='Team Rover', description='Робокоманда', direction='Robotics', needed_roles=['Python', 'CAD'])
        self.club = Club.objects.create(lead=self.owner, name='Robotics Club', category='IT', description='Клуб робототехники')
        self.idea = Idea.objects.create(author=self.owner, title='Clean Campus', description='Уборка кампуса')
        from django.utils import timezone
        self.event = Event.objects.create(organizer=self.owner, title='Робототехника-2026', description='Хакатон', starts_at=timezone.now() + timezone.timedelta(days=3), location='Главный корпус')
        self.register('student1')
        self.register('student2')
        self.profile = Profile.objects.get(user__username='student1')

    def test_cabinet_and_favorites(self):
        response = self.client.get('/api/cabinet/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['account']['profile']['user']['username'], 'student2')
        response = self.post('/api/favorites/', {'resource_type': 'project', 'resource_id': self.project.id})
        self.assertEqual(response.json()['added'], True)
        self.assertEqual(self.client.get('/api/favorites/').json()[0]['resource_type'], 'project')
        self.assertEqual(self.post('/api/favorites/', {'resource_type': 'project', 'resource_id': self.project.id}).json()['added'], False)

    def test_project_detail_join_and_comments(self):
        detail = self.client.get(f'/api/projects/{self.project.id}/')
        self.assertEqual(detail.status_code, 200)
        self.assertIn('members', detail.json())
        join = self.post(f'/api/projects/{self.project.id}/join/', {})
        self.assertEqual(join.status_code, 200)
        self.assertTrue(self.client.get(f'/api/projects/{self.project.id}/').json()['is_member'])
        comment = self.post(f'/api/projects/{self.project.id}/comments/', {'text': 'Хочу в команду'})
        self.assertEqual(comment.status_code, 201)
        self.assertEqual(len(self.client.get(f'/api/projects/{self.project.id}/comments/').json()), 1)

    def test_idea_vote_and_event_registration(self):
        vote = self.post(f'/api/ideas/{self.idea.id}/vote/', {})
        self.assertEqual(vote.json(), {'votes': 1, 'voted': True})
        self.assertTrue(self.client.get(f'/api/ideas/{self.idea.id}/').json()['voted'])
        register = self.post(f'/api/events/{self.event.id}/register/', {})
        self.assertEqual(register.status_code, 200)
        self.assertTrue(self.client.get(f'/api/events/{self.event.id}/').json()['registered'])
        cancel = self.post(f'/api/events/{self.event.id}/cancel/', {})
        self.assertEqual(cancel.status_code, 200)
        self.assertFalse(self.client.get(f'/api/events/{self.event.id}/').json()['registered'])

    def test_calendar_and_matching(self):
        calendar = self.client.get(f'/api/events/calendar/?year={2026}&month={6}')
        self.assertEqual(calendar.status_code, 200)
        matching = self.client.get('/api/matching/')
        self.assertEqual(matching.status_code, 200)
        self.assertEqual(matching.json()['projects'][0]['title'], 'Team Rover')
        apply = self.post('/api/matching/apply/', {'project_id': self.project.id, 'role': 'Python dev'})
        self.assertEqual(apply.status_code, 200)

    def test_feed_achievements_and_export(self):
        from core.models import Achievement
        Achievement.objects.create(user=self.owner, title='Лидер сообщества')
        feed = self.client.get('/api/feed/')
        self.assertEqual(feed.status_code, 200)
        self.assertIn('announcements', feed.json())
        achievements = self.client.get('/api/achievements/')
        self.assertEqual(achievements.json()[0]['title'], 'Лидер сообщества')
        response = self.post('/api/achievements/', {'user_id': User.objects.get(username='student1').id, 'title': 'Активист'})
        self.assertEqual(response.status_code, 403)
        exported = self.client.get('/api/export/')
        self.assertEqual(exported.status_code, 200)
        self.assertIn('profile', exported.json())

    def test_admissions_and_faculty(self):
        anonymous = Client(enforce_csrf_checks=True)
        csrf = anonymous.get('/api/auth/session/').json()['csrf']
        admission = anonymous.post('/api/admissions/', {'full_name': 'Новый Студент', 'email': 'new@mail.ru', 'faculty': 'ФИТ', 'motivation': 'Хочу участвовать'}, content_type='application/json', HTTP_X_CSRFTOKEN=csrf)
        self.assertEqual(admission.status_code, 201)
        self.assertEqual(self.client.get('/api/faculties/').status_code, 200)
        response = self.client.get('/api/faculties/ФИТ/')
        self.assertEqual(response.status_code, 200)

    def test_notifications_mark_read(self):
        from core.models import Notification
        Notification.objects.create(user=User.objects.get(username='student2'), title='Привет', kind='general')
        notifications = self.client.get('/api/notifications/')
        self.assertEqual(notifications.json()['count'], 1)
        first = notifications.json()['results'][0]
        self.assertEqual(self.post(f'/api/notifications/{first["id"]}/read/', {}).status_code, 200)
        self.assertTrue(self.client.get('/api/notifications/').json()['results'][0]['is_read'])

    def test_moderation_extra_payloads(self):
        moderator = User.objects.get(username='student2')
        moderator.groups.add(Group.objects.get_or_create(name='Moderators')[0])
        response = self.client.get('/api/moderation/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('ideas', response.json())
