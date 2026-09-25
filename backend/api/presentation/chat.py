from datetime import timedelta
from math import ceil

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import Project, ProjectMembership, ProjectMessage, ProjectChatRead
from .serializers import UserSerializer


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = ProjectMessage
        fields = ["id", "sender", "text", "created_at", "client_id"]


class SendSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=4000, trim_whitespace=True)
    client_id = serializers.UUIDField()


class CursorSerializer(serializers.Serializer):
    before = serializers.IntegerField(min_value=1, required=False)
    after = serializers.IntegerField(min_value=0, required=False)

    def validate(self, attrs):
        if "before" in attrs and "after" in attrs:
            raise serializers.ValidationError("Укажите только один курсор.")
        return attrs


class ReadSerializer(serializers.Serializer):
    last_read_id = serializers.IntegerField(min_value=1)


def locked_project(project_id, user):
    project = Project.objects.select_for_update().filter(pk=project_id).first()
    if project is None or (project.owner_id != user.pk and not ProjectMembership.objects.filter(project=project, user=user, accepted=True).exists()):
        raise NotFound("Чат недоступен. Требуется участие в команде.")
    return project


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def messages(request, project_id):
    project = locked_project(project_id, request.user)
    if request.method == "POST":
        payload = SendSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        own_messages = ProjectMessage.objects.filter(project=project, sender=request.user)
        item = own_messages.filter(client_id=payload.validated_data["client_id"]).first()
        if item:
            if item.text != payload.validated_data["text"]:
                return Response({"error": "Идентификатор уже использован для другого сообщения."}, status=409)
            return Response(MessageSerializer(item).data)
        now = timezone.now()
        recent = own_messages.filter(created_at__gt=now - timedelta(minutes=1))
        # The project lock serializes this database-backed limit across workers.
        if recent.count() >= 30:
            oldest = recent.order_by("created_at").first()
            wait = max(1, ceil((oldest.created_at + timedelta(minutes=1) - now).total_seconds()))
            return Response({"error": f"Слишком много сообщений. Повторите через {wait} сек.", "retry_after": wait}, status=429, headers={"Retry-After": str(wait)})
        item = ProjectMessage.objects.create(project=project, sender=request.user, **payload.validated_data)
        return Response(MessageSerializer(item).data, status=201)
    cursor = CursorSerializer(data=request.query_params)
    cursor.is_valid(raise_exception=True)
    before, after = cursor.validated_data.get("before"), cursor.validated_data.get("after")
    items = ProjectMessage.objects.filter(project=project).select_related("sender")
    if before is not None:
        items = items.filter(pk__lt=before)
    if after is not None:
        items = items.filter(pk__gt=after)
    rows = list(items.order_by("id" if after is not None else "-id")[:51])
    more = len(rows) > 50
    rows = rows[:50]
    if after is None:
        rows.reverse()
    read_id = ProjectChatRead.objects.filter(project=project, user=request.user).values_list("last_read_id", flat=True).first() or 0
    unread = ProjectMessage.objects.filter(project=project, pk__gt=read_id).exclude(sender=request.user).count()
    return Response({"results": MessageSerializer(rows, many=True).data, "unread": unread,
                     "next_before": rows[0].id if more and after is None else None,
                     "next_after": rows[-1].id if more and after is not None else None})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def mark_read(request, project_id):
    project = locked_project(project_id, request.user)
    payload = ReadSerializer(data=request.data)
    payload.is_valid(raise_exception=True)
    message_id = payload.validated_data["last_read_id"]
    if not ProjectMessage.objects.filter(project=project, pk=message_id).exists():
        raise NotFound("Сообщение не найдено.")
    marker, _ = ProjectChatRead.objects.get_or_create(project=project, user=request.user)
    if marker.last_read_id < message_id:
        marker.last_read_id = message_id
        marker.save(update_fields=["last_read_id"])
    return Response({"ok": True})
