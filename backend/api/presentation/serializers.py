from django.contrib.auth.models import User
from rest_framework import serializers

from core.models import (
    Achievement,
    AdmissionRequest,
    Announcement,
    Club,
    Comment,
    Event,
    Idea,
    Notification,
    Profile,
    Project,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    course = serializers.IntegerField(min_value=1, max_value=6)
    privacy_level = serializers.ChoiceField(choices=["public", "private"])
    skills = serializers.ListField(child=serializers.CharField(max_length=80), max_length=30, required=False)
    interests = serializers.ListField(child=serializers.CharField(max_length=80), max_length=30, required=False)

    class Meta:
        model = Profile
        fields = [
            "id", "user", "faculty", "course", "specialty", "bio", "skills", "interests",
            "is_available", "privacy_level", "looking_for_team",
        ]


class ProjectSerializer(serializers.ModelSerializer):
    needed_roles = serializers.ListField(child=serializers.CharField(max_length=80), max_length=30, required=False)
    owner = UserSerializer(read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Project
        fields = ["id", "title", "description", "goal", "direction", "status", "status_label", "owner", "needed_roles", "progress", "image", "created_at"]


class IdeaSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Idea
        fields = ["id", "title", "description", "author", "status", "status_label", "votes", "official_response", "created_at"]


class ClubSerializer(serializers.ModelSerializer):
    lead = UserSerializer(read_only=True)
    members_count = serializers.IntegerField(source="members.count", read_only=True)

    class Meta:
        model = Club
        fields = ["id", "name", "category", "description", "lead", "members_count", "is_moderated", "is_rejected", "image"]
        read_only_fields = ["is_moderated", "is_rejected"]


class EventSerializer(serializers.ModelSerializer):
    organizer = UserSerializer(read_only=True)
    attendees_count = serializers.IntegerField(source="attendees.count", read_only=True)

    class Meta:
        model = Event
        fields = ["id", "title", "description", "organizer", "starts_at", "location", "capacity", "attendees_count", "report_url"]


class NotificationSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "title", "body", "is_read", "kind", "kind_label", "created_at"]


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ["id", "title", "body", "is_published", "created_at"]


class MembershipSerializer(serializers.Serializer):
    user = UserSerializer()
    role = serializers.CharField()
    accepted = serializers.BooleanField()


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "user", "text", "created_at"]


class AchievementSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Achievement
        fields = ["id", "user", "title", "icon", "awarded_at"]


class AdmissionSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = AdmissionRequest
        fields = ["id", "full_name", "email", "faculty", "motivation", "status", "status_label", "created_at"]


class FacultySerializer(serializers.Serializer):
    name = serializers.CharField()
    students_count = serializers.IntegerField()
    projects_count = serializers.IntegerField()
    clubs_count = serializers.IntegerField()
    events_count = serializers.IntegerField()