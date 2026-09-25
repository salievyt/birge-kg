from django.contrib.auth.models import User
from django.db import models
import uuid


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Profile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    faculty = models.CharField(max_length=120)
    course = models.PositiveSmallIntegerField(default=1)
    specialty = models.CharField(max_length=160)
    bio = models.TextField(blank=True)
    skills = models.JSONField(default=list, blank=True)
    interests = models.JSONField(default=list, blank=True)
    is_available = models.BooleanField(default=True)
    privacy_level = models.CharField(max_length=30, default="public")
    looking_for_team = models.BooleanField(default=False)

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class Project(TimeStampedModel):
    STATUS_CHOICES = [
        ("recruiting", "Набор команды"),
        ("active", "В работе"),
        ("done", "Завершен"),
    ]

    title = models.CharField(max_length=180)
    description = models.TextField()
    goal = models.TextField(blank=True)
    direction = models.CharField(max_length=90)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="recruiting")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_projects")
    members = models.ManyToManyField(User, through="ProjectMembership", related_name="projects", blank=True)
    needed_roles = models.JSONField(default=list, blank=True)
    progress = models.PositiveSmallIntegerField(default=0)
    image = models.URLField(blank=True)

    def __str__(self):
        return self.title


class ProjectMembership(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=80)
    accepted = models.BooleanField(default=False)


class Idea(TimeStampedModel):
    STATUS_CHOICES = [
        ("review", "На рассмотрении"),
        ("approved", "Одобрено"),
        ("active", "Реализуется"),
        ("declined", "Отклонено"),
    ]

    title = models.CharField(max_length=180)
    description = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="ideas")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="review")
    votes = models.PositiveIntegerField(default=0)
    official_response = models.TextField(blank=True)

    def __str__(self):
        return self.title


class Club(TimeStampedModel):
    name = models.CharField(max_length=160)
    category = models.CharField(max_length=90)
    description = models.TextField()
    lead = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="led_clubs")
    members = models.ManyToManyField(User, related_name="clubs", blank=True)
    is_moderated = models.BooleanField(default=False)
    is_rejected = models.BooleanField(default=False)
    image = models.URLField(blank=True)

    def __str__(self):
        return self.name


class Event(TimeStampedModel):
    title = models.CharField(max_length=180)
    description = models.TextField()
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="events")
    club = models.ForeignKey(Club, on_delete=models.SET_NULL, null=True, blank=True, related_name="events")
    starts_at = models.DateTimeField()
    location = models.CharField(max_length=180)
    capacity = models.PositiveIntegerField(default=50)
    attendees = models.ManyToManyField(User, related_name="registered_events", blank=True)
    report_url = models.URLField(blank=True)

    def __str__(self):
        return self.title


class Notification(TimeStampedModel):
    KIND_CHOICES = [
        ("general", "Общее"),
        ("application", "Заявки"),
        ("event", "События"),
        ("moderation", "Модерация"),
        ("team", "Команда"),
        ("congrats", "Достижения"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=160)
    body = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="general")


class Announcement(TimeStampedModel):
    title = models.CharField(max_length=180)
    body = models.TextField()
    published_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_published = models.BooleanField(default=True)


class Favorite(TimeStampedModel):
    RESOURCE_CHOICES = [
        ("project", "Проект"),
        ("idea", "Идея"),
        ("club", "Клуб"),
        ("event", "Мероприятие"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorites")
    resource_type = models.CharField(max_length=20, choices=RESOURCE_CHOICES)
    resource_id = models.PositiveIntegerField()

    class Meta:
        unique_together = ("user", "resource_type", "resource_id")


class Comment(TimeStampedModel):
    RESOURCE_CHOICES = Favorite.RESOURCE_CHOICES

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comments")
    resource_type = models.CharField(max_length=20, choices=RESOURCE_CHOICES)
    resource_id = models.PositiveIntegerField()
    text = models.TextField()

    class Meta:
        ordering = ["created_at"]


class Vote(TimeStampedModel):
    idea = models.ForeignKey("Idea", on_delete=models.CASCADE, related_name="voterecords")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="votes")

    class Meta:
        unique_together = ("user", "idea")


class Achievement(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="achievements")
    title = models.CharField(max_length=160)
    icon = models.CharField(max_length=40, default="trophy")
    awarded_at = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ["-awarded_at"]

    def __str__(self):
        return f"{self.title} → {self.user.get_full_name() or self.user.username}"


class AdmissionRequest(TimeStampedModel):
    STATUS_CHOICES = [
        ("new", "Новая"),
        ("approved", "Одобрена"),
        ("rejected", "Отклонена"),
    ]

    full_name = models.CharField(max_length=160)
    email = models.EmailField()
    faculty = models.CharField(max_length=120)
    motivation = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_admissions")


class EventReminder(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="event_reminders")
    event = models.ForeignKey("Event", on_delete=models.CASCADE, related_name="reminders")

    class Meta:
        unique_together = ("user", "event")


class MediaAsset(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    content_type = models.CharField(max_length=40)
    data = models.BinaryField()
