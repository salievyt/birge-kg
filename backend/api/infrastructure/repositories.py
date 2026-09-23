from datetime import datetime

from django.db.models import Count, Q, QuerySet
from django.db.models.functions import TruncMonth

from core.models import (
    Achievement,
    AdmissionRequest,
    Announcement,
    Club,
    Comment,
    Event,
    EventReminder,
    Favorite,
    Idea,
    Notification,
    Profile,
    Project,
    ProjectMembership,
    Vote,
)


class ProfileRepository:
    @staticmethod
    def get_or_create(user):
        return Profile.objects.get_or_create(user=user)

    @staticmethod
    def public() -> QuerySet[Profile]:
        return Profile.objects.select_related("user").filter(privacy_level="public")

    @staticmethod
    def by_id(profile_id: int) -> Profile | None:
        return (
            Profile.objects.select_related("user")
            .filter(privacy_level="public", id=profile_id)
            .first()
        )

    @staticmethod
    def looking_for_team() -> QuerySet[Profile]:
        return Profile.objects.select_related("user").filter(
            privacy_level="public", looking_for_team=True, is_available=True
        )

    @staticmethod
    def of_faculty(faculty: str) -> QuerySet[Profile]:
        return Profile.objects.select_related("user").filter(
            privacy_level="public", faculty__iexact=faculty
        )

    @staticmethod
    def faculties() -> list[str]:
        return list(
            Profile.objects.exclude(faculty="")
            .values_list("faculty", flat=True)
            .distinct()
            .order_by("faculty")
        )

    @staticmethod
    def count() -> int:
        return Profile.objects.count()

    @staticmethod
    def count_of_faculty(faculty: str) -> int:
        return Profile.objects.filter(faculty__iexact=faculty).count()

    @staticmethod
    def by_faculty(limit: int = 5):
        rows = (
            Profile.objects.values("faculty")
            .annotate(count=Count("id"))
            .order_by("-count", "faculty")[:limit]
        )
        return [{"name": row["faculty"], "count": row["count"]} for row in rows]


class ProjectRepository:
    @staticmethod
    def all() -> QuerySet[Project]:
        return Project.objects.select_related("owner").all()

    @staticmethod
    def newest(limit: int | None = None) -> QuerySet[Project]:
        projects = Project.objects.select_related("owner").order_by("-created_at")
        return projects[:limit] if limit else projects

    @staticmethod
    def by_id(project_id: int) -> Project | None:
        return Project.objects.select_related("owner").filter(id=project_id).first()

    @staticmethod
    def for_user(user) -> QuerySet[Project]:
        return Project.objects.filter(Q(owner=user) | Q(members=user)).distinct()

    @staticmethod
    def of_faculty(faculty: str) -> QuerySet[Project]:
        return Project.objects.select_related("owner").filter(owner__profile__faculty__iexact=faculty)

    @staticmethod
    def recruiting() -> QuerySet[Project]:
        return Project.objects.select_related("owner").filter(
            status="recruiting"
        ).exclude(needed_roles=[]).order_by("-created_at")

    @staticmethod
    def member(user, project) -> bool:
        return ProjectMembership.objects.filter(
            project=project, user=user, accepted=True
        ).exists()

    @staticmethod
    def memberships(project) -> list[ProjectMembership]:
        return list(
            ProjectMembership.objects.filter(project=project, accepted=True)
            .select_related("user")
            .order_by("created_at")
        )

    @staticmethod
    def pending_membership(user, project):
        return ProjectMembership.objects.filter(
            project=project, user=user, accepted=False
        ).first()

    @staticmethod
    def count() -> int:
        return Project.objects.count()

    @staticmethod
    def by_direction(limit: int = 5):
        rows = (
            Project.objects.values("direction")
            .annotate(count=Count("id"))
            .order_by("-count", "direction")[:limit]
        )
        return [{"name": row["direction"], "count": row["count"]} for row in rows]

    @staticmethod
    def monthly(since):
        return (
            Project.objects.filter(created_at__gte=since)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )


class IdeaRepository:
    @staticmethod
    def top(limit: int | None = None) -> QuerySet[Idea]:
        ideas = Idea.objects.select_related("author").order_by("-votes", "-created_at")
        return ideas[:limit] if limit else ideas

    @staticmethod
    def by_id(idea_id: int) -> Idea | None:
        return Idea.objects.select_related("author").filter(id=idea_id).first()

    @staticmethod
    def for_user(user) -> QuerySet[Idea]:
        return Idea.objects.filter(author=user)

    @staticmethod
    def review() -> QuerySet[Idea]:
        return Idea.objects.filter(status="review")

    @staticmethod
    def count() -> int:
        return Idea.objects.count()

    @staticmethod
    def monthly(since):
        return (
            Idea.objects.filter(created_at__gte=since)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )


class ClubRepository:
    @staticmethod
    def all() -> QuerySet[Club]:
        return Club.objects.select_related("lead").prefetch_related("members").order_by("name")

    @staticmethod
    def by_id(club_id: int) -> Club | None:
        return Club.objects.select_related("lead").filter(id=club_id).first()

    @staticmethod
    def for_user(user) -> QuerySet[Club]:
        return Club.objects.filter(Q(lead=user) | Q(members=user)).distinct()

    @staticmethod
    def of_faculty(faculty: str) -> QuerySet[Club]:
        return Club.objects.select_related("lead").filter(lead__profile__faculty__iexact=faculty)

    @staticmethod
    def unmoderated() -> QuerySet[Club]:
        return Club.objects.filter(is_moderated=False)

    @staticmethod
    def count() -> int:
        return Club.objects.count()

    @staticmethod
    def monthly(since):
        return (
            Club.objects.filter(created_at__gte=since)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )


class EventRepository:
    @staticmethod
    def all() -> QuerySet[Event]:
        return Event.objects.select_related("organizer", "club").prefetch_related("attendees").order_by("starts_at")

    @staticmethod
    def by_id(event_id: int) -> Event | None:
        return Event.objects.select_related("organizer", "club").filter(id=event_id).first()

    @staticmethod
    def for_user(user) -> QuerySet[Event]:
        return Event.objects.filter(Q(organizer=user) | Q(attendees=user)).distinct()

    @staticmethod
    def of_faculty(faculty: str) -> QuerySet[Event]:
        return Event.objects.select_related("organizer").filter(
            organizer__profile__faculty__iexact=faculty
        )

    @staticmethod
    def upcoming(limit: int | None = None) -> QuerySet[Event]:
        events = Event.objects.select_related("organizer", "club").filter(
            starts_at__gte=datetime.now()
        ).order_by("starts_at")
        return events[:limit] if limit else events

    @staticmethod
    def in_month(year: int, month: int) -> QuerySet[Event]:
        return Event.objects.filter(starts_at__year=year, starts_at__month=month).order_by("starts_at")

    @staticmethod
    def count() -> int:
        return Event.objects.count()

    @staticmethod
    def monthly(since):
        return (
            Event.objects.filter(created_at__gte=since)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )


class NotificationRepository:
    @staticmethod
    def none() -> QuerySet[Notification]:
        return Notification.objects.none()

    @staticmethod
    def for_user(user, kind: str | None = None) -> QuerySet[Notification]:
        items = Notification.objects.filter(user=user)
        if kind:
            items = items.filter(kind=kind)
        return items.order_by("-created_at")

    @staticmethod
    def create(user, title: str, body: str = "", kind: str = "general") -> Notification:
        return Notification.objects.create(user=user, title=title, body=body, kind=kind)

    @staticmethod
    def mark_read(notification) -> None:
        Notification.objects.filter(id=notification.id).update(is_read=True)

    @staticmethod
    def mark_all(user) -> int:
        return Notification.objects.filter(user=user, is_read=False).update(is_read=True)

    @staticmethod
    def unread_count(user) -> int:
        return Notification.objects.filter(user=user, is_read=False).count()


class AnnouncementRepository:
    @staticmethod
    def published() -> QuerySet[Announcement]:
        return Announcement.objects.filter(is_published=True).order_by("-created_at")


class FavoriteRepository:
    @staticmethod
    def for_user(user) -> QuerySet[Favorite]:
        return Favorite.objects.filter(user=user).order_by("-created_at")

    @staticmethod
    def is_favorited(user, resource_type: str, resource_id: int) -> bool:
        return Favorite.objects.filter(
            user=user, resource_type=resource_type, resource_id=resource_id
        ).exists()

    @staticmethod
    def toggle(user, resource_type: str, resource_id: int) -> bool:
        favorite = Favorite.objects.filter(
            user=user, resource_type=resource_type, resource_id=resource_id
        ).first()
        if favorite:
            favorite.delete()
            return False
        Favorite.objects.create(user=user, resource_type=resource_type, resource_id=resource_id)
        return True


class CommentRepository:
    @staticmethod
    def for_resource(resource_type: str, resource_id: int) -> QuerySet[Comment]:
        return Comment.objects.filter(
            resource_type=resource_type, resource_id=resource_id
        ).select_related("user")

    @staticmethod
    def add(user, resource_type: str, resource_id: int, text: str) -> Comment:
        return Comment.objects.create(
            user=user, resource_type=resource_type, resource_id=resource_id, text=text
        )


class VoteRepository:
    @staticmethod
    def has_voted(user, idea: Idea) -> bool:
        return Vote.objects.filter(user=user, idea=idea).exists()

    @staticmethod
    def toggle(user, idea: Idea) -> bool:
        vote = Vote.objects.filter(user=user, idea=idea).first()
        if vote:
            vote.delete()
            return False
        Vote.objects.create(user=user, idea=idea)
        return True


class AchievementRepository:
    @staticmethod
    def recent(limit: int = 50) -> QuerySet[Achievement]:
        return Achievement.objects.select_related("user").order_by("-awarded_at", "-id")[:limit]

    @staticmethod
    def for_user(user) -> QuerySet[Achievement]:
        return Achievement.objects.filter(user=user).order_by("-awarded_at")

    @staticmethod
    def create(user, title: str, icon: str = "trophy") -> Achievement:
        return Achievement.objects.create(user=user, title=title, icon=icon)


class AdmissionRepository:
    @staticmethod
    def by_id(admission_id: int) -> AdmissionRequest | None:
        return AdmissionRequest.objects.filter(id=admission_id).first()

    @staticmethod
    def pending() -> QuerySet[AdmissionRequest]:
        return AdmissionRequest.objects.filter(status="new").order_by("-created_at")

    @staticmethod
    def all() -> QuerySet[AdmissionRequest]:
        return AdmissionRequest.objects.order_by("-created_at")

    @staticmethod
    def create(full_name, email, faculty, motivation) -> AdmissionRequest:
        return AdmissionRequest.objects.create(
            full_name=full_name, email=email, faculty=faculty, motivation=motivation
        )


class EventReminderRepository:
    @staticmethod
    def has(user, event: Event) -> bool:
        return EventReminder.objects.filter(user=user, event=event).exists()

    @staticmethod
    def toggle(user, event: Event) -> bool:
        reminder = EventReminder.objects.filter(user=user, event=event).first()
        if reminder:
            reminder.delete()
            return False
        EventReminder.objects.create(user=user, event=event)
        return True