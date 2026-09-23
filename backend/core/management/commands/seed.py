from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Announcement, Club, Event, Idea, Profile, Project


class Command(BaseCommand):
    help = "Create demo data for the BIRGE prototype."

    def handle(self, *args, **options):
        users = []
        for username, first_name, last_name, faculty, specialty, skills in [
            ("nursultan", "Нурсултан", "Асанов", "ФИТ", "Программная инженерия", ["React", "Python", "UI"]),
            ("alina", "Алина", "Маматова", "Экономика", "Маркетинг", ["PR", "SMM", "Организация"]),
            ("bektur", "Бектур", "Садыков", "Энергетика", "Электроэнергетика", ["IoT", "Arduino", "Робототехника"]),
        ]:
            user, _ = User.objects.get_or_create(username=username, defaults={"first_name": first_name, "last_name": last_name})
            Profile.objects.get_or_create(
                user=user,
                defaults={
                    "faculty": faculty,
                    "course": 3,
                    "specialty": specialty,
                    "bio": "Открыт к университетским инициативам и командным проектам.",
                    "skills": skills,
                    "interests": ["стартапы", "мероприятия", "университет"],
                },
            )
            users.append(user)

        project, _ = Project.objects.get_or_create(
            title="Smart Campus Map",
            defaults={
                "description": "Интерактивная карта корпусов, аудиторий и сервисов ОшТУ.",
                "goal": "Упростить навигацию для студентов и гостей университета.",
                "direction": "IT",
                "owner": users[0],
                "needed_roles": ["Frontend", "Дизайнер", "Контент-редактор"],
                "progress": 32,
            },
        )
        project.members.add(users[0])

        Idea.objects.get_or_create(
            title="QR-навигация по корпусам",
            defaults={
                "description": "Разместить QR-коды у входов и на этажах, чтобы быстро находить аудитории.",
                "author": users[1],
                "status": "active",
                "votes": 98,
                "official_response": "Деканат готовит пилот в главном корпусе.",
            },
        )

        club, _ = Club.objects.get_or_create(
            name="BIRGE IT Club",
            defaults={
                "category": "IT",
                "description": "Сообщество для разработки, дизайна, хакатонов и обмена опытом.",
                "lead": users[0],
                "is_moderated": True,
            },
        )
        club.members.add(*users)

        Event.objects.get_or_create(
            title="Hackathon OshTU",
            defaults={
                "description": "Командная разработка решений для университета за 48 часов.",
                "organizer": users[0],
                "club": club,
                "starts_at": timezone.now() + timezone.timedelta(days=7),
                "location": "Главный корпус",
                "capacity": 80,
            },
        )

        Announcement.objects.get_or_create(
            title="Добро пожаловать в BIRGE",
            defaults={"body": "Платформа открыта для первых студенческих проектов и клубов.", "published_by": users[0]},
        )

        self.stdout.write(self.style.SUCCESS("Demo data is ready."))
