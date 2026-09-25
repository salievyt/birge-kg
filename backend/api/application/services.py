from calendar import monthrange
from datetime import timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from core.models import (
    AdmissionRequest,
    Club,
    Comment,
    Event,
    EventReminder,
    Idea,
    Project,
    ProjectMembership,
    ProjectMessage,
    ProjectChatRead,
    Profile,
)

from ..infrastructure.repositories import (
    AchievementRepository,
    AdmissionRepository,
    AnnouncementRepository,
    ClubRepository,
    CommentRepository,
    EventReminderRepository,
    EventRepository,
    FavoriteRepository,
    IdeaRepository,
    NotificationRepository,
    ProfileRepository,
    ProjectRepository,
    VoteRepository,
)


def _month_key(value) -> str | None:
    return value.strftime("%Y-%m") if value else None


def _monthly_labels(months: int = 6) -> list[str]:
    year, month = timezone.now().year, timezone.now().month
    labels = []
    for offset in range(months - 1, -1, -1):
        m = month - offset
        y = year
        while m <= 0:
            m += 12
            y -= 1
        labels.append(f"{y:04d}-{m:02d}")
    return labels


class AccountService:
    """Auth/account use cases: session, sign-in, registration, personal cabinet."""

    def __init__(
        self,
        profile_repo=ProfileRepository,
        project_repo=ProjectRepository,
        club_repo=ClubRepository,
        event_repo=EventRepository,
        notification_repo=NotificationRepository,
    ):
        self.profile_repo = profile_repo
        self.project_repo = project_repo
        self.club_repo = club_repo
        self.event_repo = event_repo
        self.notification_repo = notification_repo

    @staticmethod
    def is_moderator(user) -> bool:
        return user.is_authenticated and (
            user.is_staff or user.is_superuser or user.groups.filter(name="Moderators").exists()
        )

    def account(self, user):
        """Core account payload: profile entity + moderation flag."""
        profile, _ = self.profile_repo.get_or_create(user)
        return {"profile": profile, "can_moderate": self.is_moderator(user)}

    def sign_in(self, username: str, password: str) -> User | None:
        return authenticate(username=username, password=password)

    def register(self, username: str, first_name: str, password: str, email: str = "") -> User:
        if not username or not first_name or len(username) > 150 or len(first_name) > 150:
            raise ValidationError("Укажите имя и логин (до 150 символов).")
        User._meta.get_field("username").run_validators(username)
        if User.objects.filter(username__iexact=username).exists():
            raise ValidationError("Этот логин уже занят.")
        from django.core.validators import validate_email
        if email:
            validate_email(email)
            if User.objects.filter(email__iexact=email).exists():
                raise ValidationError("Этот email уже используется.")
        user = User(username=username, first_name=first_name, email=email)
        validate_password(password, user)
        with transaction.atomic():
            user.set_password(password)
            user.save()
            Profile.objects.create(user=user)
        return user

    def personal_cabinet(self, user):
        """Data for the personal cabinet: account + user's entities."""
        return {
            "account": self.account(user),
            "projects": self.project_repo.for_user(user),
            "clubs": self.club_repo.for_user(user),
            "events": self.event_repo.for_user(user),
            "notifications": self.notification_repo.for_user(user),
        }


class DashboardService:
    """Dashboard use case: aggregate stats and highlights for the landing screen."""

    def __init__(
        self,
        project_repo=ProjectRepository,
        profile_repo=ProfileRepository,
        club_repo=ClubRepository,
        event_repo=EventRepository,
        idea_repo=IdeaRepository,
    ):
        self.project_repo = project_repo
        self.profile_repo = profile_repo
        self.club_repo = club_repo
        self.event_repo = event_repo
        self.idea_repo = idea_repo

    def payload(self):
        return {
            "stats": {
                "projects": self.project_repo.count(),
                "participants": self.profile_repo.count(),
                "clubs": self.club_repo.count(),
                "events": self.event_repo.count(),
            },
            "activity": self._activity(),
            "top_faculties": self.profile_repo.by_faculty(limit=5),
            "directions": self.project_repo.by_direction(limit=5),
            "latest_projects": self.project_repo.newest(limit=5),
            "top_ideas": self.idea_repo.top(limit=5),
        }

    def _activity(self) -> list[dict]:
        since = timezone.now() - timedelta(days=180)
        total: dict[str, int] = {}
        for repo in (self.project_repo, self.idea_repo, self.club_repo, self.event_repo):
            for row in repo.monthly(since):
                key = _month_key(row["month"])
                if key is None:
                    continue
                total[key] = total.get(key, 0) + row["count"]
        return [
            {"month": label, "count": total.get(label, 0)}
            for label in _monthly_labels()
        ]


class ModerationService:
    """Moderation use case: overview of entities pending moderation."""

    def __init__(
        self,
        project_repo=ProjectRepository,
        club_repo=ClubRepository,
        idea_repo=IdeaRepository,
        admission_repo=AdmissionRepository,
        moderator_check=AccountService.is_moderator,
    ):
        self.project_repo = project_repo
        self.club_repo = club_repo
        self.idea_repo = idea_repo
        self.admission_repo = admission_repo
        self.moderator_check = moderator_check

    def can_moderate(self, user) -> bool:
        return self.moderator_check(user)

    def payload(self):
        return {
            "projects": self.project_repo.all(),
            "clubs": self.club_repo.unmoderated(),
            "ideas": self.idea_repo.review(),
            "admissions": self.admission_repo.pending(),
        }

    @transaction.atomic
    def decide(self, resource: str, resource_id: int, action: str, user):
        """Decide on a pending entity: admissions, ideas or clubs."""
        if not self.can_moderate(user):
            raise ValidationError("Доступ только для модераторов и администраторов.")
        if action not in ("approve", "reject"):
            raise ValidationError("Недопустимое действие.")
        if resource == "admissions":
            admission = self.admission_repo.by_id(resource_id)
            if admission is None or admission.status != "new":
                raise ValidationError("Заявка не найдена или уже рассмотрена.")
            if action not in ("approve", "reject"):
                raise ValidationError("Недопустимое действие.")
            admission.status = "approved" if action == "approve" else "rejected"
            admission.reviewed_by = user
            admission.save(update_fields=["status", "reviewed_by"])
            return admission
        if resource == "ideas":
            idea = self.idea_repo.by_id(resource_id)
            if idea is None or idea.status != "review":
                raise ValidationError("Идея не найдена или уже рассмотрена.")
            idea.status = "approved" if action == "approve" else "declined"
            idea.save(update_fields=["status"])
            NotificationRepository.create(idea.author, "Идея рассмотрена", f"«{idea.title}»: {idea.get_status_display()}.", "moderation")
            return idea
        if resource == "clubs":
            club = Club.objects.filter(id=resource_id, is_moderated=False, is_rejected=False).first()
            if club is None:
                raise ValidationError("Клуб не найден.")
            club.is_moderated = action == "approve"
            club.is_rejected = action == "reject"
            club.save(update_fields=["is_moderated", "is_rejected"])
            NotificationRepository.create(club.lead, "Клуб рассмотрен", f"«{club.name}»: " + ("одобрен." if action == "approve" else "отклонён. Вы можете внести правки и отправить клуб повторно."), "moderation")
            return club
        raise ValidationError("Неизвестный ресурс для модерации.")


class ItemService:
    """Detail/join/comment use cases for projects, clubs and ideas."""

    def __init__(
        self,
        project_repo=ProjectRepository,
        club_repo=ClubRepository,
        idea_repo=IdeaRepository,
        comment_repo=None,
        notification_repo=NotificationRepository,
    ):
        self.project_repo = project_repo
        self.club_repo = club_repo
        self.idea_repo = idea_repo
        self.comment_repo = CommentRepository
        self.notification_repo = notification_repo

    def _resolve(self, resource: str, resource_id: int):
        if resource == "project":
            return self.project_repo.by_id(resource_id)
        if resource == "club":
            return self.club_repo.by_id(resource_id)
        if resource == "idea":
            return self.idea_repo.by_id(resource_id)
        return None

    def detail(self, resource: str, resource_id: int, user):
        item = self._resolve(resource, resource_id)
        if item is None and resource == "club" and user.is_authenticated:
            candidates = Club.objects.filter(pk=resource_id)
            if not AccountService.is_moderator(user):
                candidates = candidates.filter(lead=user)
            item = candidates.first()
        if item is None:
            return None
        return {
            "item": item,
            "resource": resource,
            "members": self._members(resource, item),
            "comments": self.comment_repo.for_resource(resource, resource_id),
            "is_member": self._is_member(resource, item, user),
            "chat_unread": self._chat_unread(item, user) if resource == "project" and self._is_member(resource, item, user) else 0,
            "is_owner": self._is_owner(resource, item, user),
            "is_pending": resource == "project" and user.is_authenticated and ProjectMembership.objects.filter(project=item, user=user, accepted=False).exists(),
            "applications": ProjectMembership.objects.filter(project=item, accepted=False).select_related("user") if resource == "project" and self._is_owner(resource, item, user) else [],
            "is_favorited": FavoriteRepository.is_favorited(user, resource, resource_id) if user.is_authenticated else False,
        }

    def _chat_unread(self, project, user):
        read_id = ProjectChatRead.objects.filter(project=project, user=user).values_list("last_read_id", flat=True).first() or 0
        return ProjectMessage.objects.filter(project=project, pk__gt=read_id).exclude(sender=user).count()

    def _members(self, resource: str, item):
        if resource == "project" and isinstance(item, Project):
            return [{"user": item.owner, "role": "руководитель", "accepted": True}, *[m for m in self.project_repo.memberships(item) if m.user_id != item.owner_id]]
        if resource == "club" and isinstance(item, Club):
            return [{"user": item.lead, "role": "руководитель", "accepted": True}, *[
                {"user": member, "role": "участник", "accepted": True}
                for member in item.members.exclude(pk=item.lead_id).select_related("profile__user")
            ]]
        return []

    def _is_member(self, resource: str, item, user) -> bool:
        if not user.is_authenticated:
            return False
        if resource == "project" and isinstance(item, Project):
            return item.owner_id == user.id or ProjectMembership.objects.filter(project=item, user=user, accepted=True).exists()
        if resource == "club" and isinstance(item, Club):
            return item.lead_id == user.id or item.members.filter(id=user.id).exists()
        if resource == "idea" and isinstance(item, Idea):
            return item.author_id == user.id
        return False

    def _is_owner(self, resource: str, item, user) -> bool:
        if not user.is_authenticated:
            return False
        if resource == "project" and isinstance(item, Project):
            return item.owner_id == user.id
        if resource == "club" and isinstance(item, Club):
            return item.lead_id == user.id
        if resource == "idea" and isinstance(item, Idea):
            return item.author_id == user.id
        return False

    def join(self, resource: str, resource_id: int, user):
        item = self._resolve(resource, resource_id)
        if item is None:
            raise ValidationError("Запись не найдена.")
        owner = None
        if resource == "project" and isinstance(item, Project):
            return MatchingService().apply(item.id, user, "участник")
        elif resource == "club" and isinstance(item, Club):
            item.members.add(user)
            owner = item.lead
        else:
            raise ValidationError("К этому разделу нельзя присоединиться.")
        if owner and owner.id != user.id:
            self.notification_repo.create(
                owner,
                "Новая заявка в команду",
                f"{user.get_full_name() or user.username} хочет присоединиться: {item}.",
                "team",
            )
        return item

    @transaction.atomic
    def leave(self, resource: str, resource_id: int, user):
        item = Project.objects.select_for_update().filter(pk=resource_id).first() if resource == "project" else self._resolve(resource, resource_id)
        if item is None:
            raise ValidationError("Запись не найдена.")
        if resource == "project" and isinstance(item, Project):
            if item.owner_id == user.id:
                raise ValidationError("Владелец не может покинуть проект.")
            ProjectMembership.objects.filter(project=item, user=user).delete()
            item.members.remove(user)
        elif resource == "club" and isinstance(item, Club):
            if item.lead_id == user.id:
                raise ValidationError("Руководитель не может покинуть клуб.")
            item.members.remove(user)
        else:
            raise ValidationError("Здесь нельзя отказаться от участия.")
        return item

    def comment(self, resource: str, resource_id: int, user, text: str):
        text = (text or "").strip()
        if not text:
            raise ValidationError("Комментарий не может быть пустым.")
        item = self._resolve(resource, resource_id)
        if item is None:
            raise ValidationError("Запись не найдена.")
        comment = self.comment_repo.add(user, resource, resource_id, text)
        target = getattr(item, "owner", None) or getattr(item, "author", None) or getattr(item, "lead", None)
        if target and target.id != user.id:
            self.notification_repo.create(
                target,
                "Новый комментарий",
                f"{user.get_full_name() or user.username} оставил комментарий: «{text[:80]}»",
                "general",
            )
        return comment


class EventService:
    """Events: detail, registration, reminders and the calendar view."""

    def __init__(
        self,
        event_repo=EventRepository,
        notification_repo=NotificationRepository,
    ):
        self.event_repo = event_repo
        self.notification_repo = notification_repo

    def detail(self, event_id: int, user):
        event = self.event_repo.by_id(event_id)
        if event is None:
            return None
        attendees = event.attendees.all().select_related("profile__user")
        return {
            "item": event,
            "attendees": attendees[:12],
            "attendees_count": event.attendees.count(),
            "registered": event.attendees.filter(id=user.id).exists() if user.is_authenticated else False,
            "is_organizer": event.organizer_id == user.id if user.is_authenticated else False,
            "reminder": EventReminderRepository.has(user, event) if user.is_authenticated else False,
            "is_favorited": FavoriteRepository.is_favorited(user, "event", event_id) if user.is_authenticated else False,
        }

    @transaction.atomic
    def register(self, event_id: int, user):
        event = Event.objects.select_for_update().filter(pk=event_id).first()
        if event is None:
            raise ValidationError("Событие не найдено.")
        if event.starts_at <= timezone.now():
            raise ValidationError("Регистрация на это событие уже закрыта.")
        if event.attendees.filter(id=user.id).exists() or event.organizer_id == user.id:
            raise ValidationError("Вы уже зарегистрированы.")
        if event.capacity and event.attendees.count() >= event.capacity:
            raise ValidationError("Места на событии закончились.")
        event.attendees.add(user)
        if event.organizer_id != user.id:
            self.notification_repo.create(
                event.organizer,
                "Новая регистрация",
                f"{user.get_full_name() or user.username} зарегистрировался на «{event.title}».",
                "event",
            )
        return event

    @transaction.atomic
    def cancel(self, event_id: int, user):
        event = Event.objects.select_for_update().filter(pk=event_id).first()
        if event is None:
            raise ValidationError("Событие не найдено.")
        event.attendees.remove(user)
        EventReminder.objects.filter(event=event, user=user).update(enabled=False)
        return event

    @transaction.atomic
    def toggle_reminder(self, event_id: int, user):
        event = Event.objects.select_for_update().filter(pk=event_id).first()
        if event is None:
            raise ValidationError("Событие не найдено.")
        if event.starts_at <= timezone.now():
            raise ValidationError("Мероприятие уже началось.")
        if not event.attendees.filter(pk=user.pk).exists():
            raise ValidationError("Сначала зарегистрируйтесь на мероприятие.")
        return EventReminderRepository.toggle(user, event)

    def calendar(self, year: int, month: int):
        return self.event_repo.in_month(year, month)


class FavoritesService:
    """Favorites: list with resolved objects and toggle."""

    def __init__(
        self,
        favorite_repo=FavoriteRepository,
        project_repo=ProjectRepository,
        idea_repo=IdeaRepository,
        club_repo=ClubRepository,
        event_repo=EventRepository,
    ):
        self.favorite_repo = favorite_repo
        self.project_repo = project_repo
        self.idea_repo = idea_repo
        self.club_repo = club_repo
        self.event_repo = event_repo

    def _resolve_item(self, resource_type: str, resource_id: int):
        if resource_type == "project":
            return self.project_repo.by_id(resource_id)
        if resource_type == "idea":
            return self.idea_repo.by_id(resource_id)
        if resource_type == "club":
            return self.club_repo.by_id(resource_id)
        if resource_type == "event":
            return self.event_repo.by_id(resource_id)
        return None

    def for_user(self, user):
        return [
            {
                "favorite": favorite,
                "item": self._resolve_item(favorite.resource_type, favorite.resource_id),
            }
            for favorite in self.favorite_repo.for_user(user)
        ]

    def toggle(self, user, resource_type: str, resource_id: int) -> bool:
        if resource_type not in ("project", "idea", "club", "event"):
            raise ValidationError("Недопустимый тип для избранного.")
        if self._resolve_item(resource_type, resource_id) is None:
            raise ValidationError("Запись не найдена.")
        return self.favorite_repo.toggle(user, resource_type, resource_id)


class MatchingService:
    """Team matching: projects that need people and people looking for a team."""

    def __init__(
        self,
        project_repo=ProjectRepository,
        profile_repo=ProfileRepository,
        notification_repo=NotificationRepository,
    ):
        self.project_repo = project_repo
        self.profile_repo = profile_repo
        self.notification_repo = notification_repo

    def payload(self):
        return {
            "projects": self.project_repo.recruiting(),
            "people": self.profile_repo.looking_for_team(),
        }

    def apply(self, project_id: int, user, role: str):
        return self._apply(project_id, user, role)

    @transaction.atomic
    def _apply(self, project_id: int, user, role: str):
        project = Project.objects.select_for_update().filter(pk=project_id).first()
        if project is None:
            raise ValidationError("Проект не найден.")
        if project.owner_id == user.id:
            raise ValidationError("Вы руководитель этого проекта.")
        if project.status != "recruiting":
            raise ValidationError("Набор в этот проект закрыт.")
        if len(role.strip()) > 80:
            raise ValidationError("Название роли не должно превышать 80 символов.")
        if ProjectMembership.objects.filter(project=project, user=user).exists():
            raise ValidationError("Вы уже подали заявку в этот проект.")
        ProjectMembership.objects.create(
            project=project, user=user, role=(role or "").strip() or "участник", accepted=False
        )
        self.notification_repo.create(
            project.owner,
            "Заявка на участие",
            f"{user.get_full_name() or user.username} хочет присоединиться к «{project.title}».",
            "application",
        )
        return project

    @transaction.atomic
    def decide(self, project_id: int, member_id: int, action: str, user):
        project = Project.objects.select_for_update().filter(pk=project_id, owner=user).first()
        if project is None:
            raise ValidationError("Заявки может рассматривать только руководитель проекта.")
        membership = ProjectMembership.objects.filter(project=project, user_id=member_id, accepted=False).first()
        if membership is None or action not in ("approve", "reject"):
            raise ValidationError("Заявка не найдена или уже рассмотрена.")
        if action == "approve":
            membership.accepted = True
            membership.save(update_fields=["accepted"])
        else:
            membership.delete()
        self.notification_repo.create(membership.user, "Заявка рассмотрена", f"{project.title}: " + ("вы приняты в команду." if action == "approve" else "заявка отклонена."), "application")


class FeedService:
    """News feed: announcements, upcoming events, latest projects and ideas."""

    def __init__(
        self,
        announcement_repo=AnnouncementRepository,
        event_repo=EventRepository,
        project_repo=ProjectRepository,
        idea_repo=IdeaRepository,
    ):
        self.announcement_repo = announcement_repo
        self.event_repo = event_repo
        self.project_repo = project_repo
        self.idea_repo = idea_repo

    def payload(self):
        return {
            "announcements": self.announcement_repo.published(),
            "events": self.event_repo.upcoming(limit=5),
            "projects": self.project_repo.newest(limit=4),
            "ideas": self.idea_repo.top(limit=4),
        }


class AchievementsService:
    """Achievements wall and awarding."""

    def __init__(
        self,
        achievement_repo=AchievementRepository,
        notification_repo=NotificationRepository,
    ):
        self.achievement_repo = achievement_repo
        self.notification_repo = notification_repo

    def recent(self):
        return self.achievement_repo.recent()

    def award(self, user, title: str, icon: str, moderator):
        title = (title or "").strip()
        if not title:
            raise ValidationError("Укажите название достижения.")
        achievement = self.achievement_repo.create(user, title, icon or "trophy")
        self.notification_repo.create(
            user,
            "Новое достижение 🏆",
            f"Вам присвоено достижение «{title}».",
            "congrats",
        )
        return achievement


class VotesService:
    """Idea voting: toggle a vote and keep the counter consistent."""

    def __init__(self, vote_repo=VoteRepository, idea_repo=IdeaRepository):
        self.vote_repo = vote_repo
        self.idea_repo = idea_repo

    def toggle(self, idea_id: int, user):
        idea = self.idea_repo.by_id(idea_id)
        if idea is None:
            raise ValidationError("Идея не найдена.")
        added = self.vote_repo.toggle(user, idea)
        idea.votes = idea.votes + 1 if added else max(0, idea.votes - 1)
        idea.save(update_fields=["votes"])
        return {"votes": idea.votes, "voted": added}


class AdmissionService:
    """Admission requests: submit from a public form and moderate."""

    def __init__(
        self,
        admission_repo=AdmissionRepository,
        notification_repo=NotificationRepository,
    ):
        self.admission_repo = admission_repo
        self.notification_repo = notification_repo

    def create(self, full_name: str, email: str, faculty: str, motivation: str):
        if not full_name or len(full_name) > 160:
            raise ValidationError("Укажите имя (до 160 символов).")
        if not email or len(email) > 254:
            raise ValidationError("Укажите корректный email.")
        if not faculty:
            raise ValidationError("Укажите факультет.")
        return self.admission_repo.create(
            full_name=full_name.strip(),
            email=email.strip(),
            faculty=faculty.strip(),
            motivation=(motivation or "").strip(),
        )

    def decide(self, admission_id: int, action: str, user):
        admission = self.admission_repo.by_id(admission_id)
        if admission is None:
            raise ValidationError("Заявка не найдена.")
        if action not in ("approve", "reject"):
            raise ValidationError("Недопустимое действие.")
        admission.status = "approved" if action == "approve" else "rejected"
        admission.reviewed_by = user
        admission.save(update_fields=["status", "reviewed_by"])
        return admission


class FacultyService:
    """Faculty page: stats, students, projects, clubs and events."""

    def __init__(
        self,
        profile_repo=ProfileRepository,
        project_repo=ProjectRepository,
        club_repo=ClubRepository,
        event_repo=EventRepository,
    ):
        self.profile_repo = profile_repo
        self.project_repo = project_repo
        self.club_repo = club_repo
        self.event_repo = event_repo

    def detail(self, faculty: str):
        students = self.profile_repo.of_faculty(faculty)
        projects = self.project_repo.of_faculty(faculty)
        clubs = self.club_repo.of_faculty(faculty)
        events = self.event_repo.of_faculty(faculty)
        return {
            "name": faculty,
            "students_count": students.count(),
            "projects_count": projects.count(),
            "clubs_count": clubs.count(),
            "events_count": events.count(),
            "students": students,
            "projects": projects,
            "clubs": clubs,
            "events": events,
        }


class ExportService:
    """Export user data as a JSON document."""

    def dump(self, user):
        profile, _ = ProfileRepository.get_or_create(user)
        return {
            "exported_at": timezone.now().isoformat(),
            "user": {
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
            },
            "profile": {
                "faculty": profile.faculty,
                "course": profile.course,
                "specialty": profile.specialty,
                "bio": profile.bio,
                "skills": profile.skills,
                "interests": profile.interests,
                "privacy_level": profile.privacy_level,
                "is_available": profile.is_available,
                "looking_for_team": profile.looking_for_team,
            },
            "projects": [
                {
                    "title": p.title,
                    "description": p.description,
                    "direction": p.direction,
                    "status": p.status,
                    "role": "owner" if p.owner_id == user.id else "member",
                }
                for p in ProjectRepository.for_user(user)
            ],
            "ideas": [
                {"title": i.title, "description": i.description, "status": i.status, "votes": i.votes}
                for i in IdeaRepository.for_user(user)
            ],
            "clubs": [
                {"name": c.name, "category": c.category}
                for c in ClubRepository.for_user(user)
            ],
            "events": [
                {"title": e.title, "starts_at": e.starts_at.isoformat(), "location": e.location}
                for e in EventRepository.for_user(user)
            ],
            "achievements": [
                {"title": a.title, "icon": a.icon, "awarded_at": a.awarded_at.isoformat()}
                for a in AchievementRepository.for_user(user)
            ],
            "favorites": [
                {"resource_type": f.resource_type, "resource_id": f.resource_id}
                for f in FavoriteRepository.for_user(user)
            ],
            "comments": [
                {"resource_type": c.resource_type, "resource_id": c.resource_id, "text": c.text, "created_at": c.created_at.isoformat()}
                for c in Comment.objects.filter(user=user)
            ],
            "notifications": [
                {"title": n.title, "kind": n.kind, "is_read": n.is_read, "created_at": n.created_at.isoformat()}
                for n in NotificationRepository.for_user(user)
            ],
        }