import json
import os
import uuid
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods
from rest_framework import filters, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from ..permissions import PublicReadOwnerWrite

from ..application.services import (
    AccountService,
    AchievementsService,
    AdmissionService,
    DashboardService,
    EventService,
    ExportService,
    FacultyService,
    FavoritesService,
    FeedService,
    ItemService,
    MatchingService,
    ModerationService,
    VotesService,
)
from ..infrastructure.repositories import (
    AnnouncementRepository,
    ClubRepository,
    CommentRepository,
    EventRepository,
    IdeaRepository,
    NotificationRepository,
    ProfileRepository,
    ProjectRepository,
)

from .serializers import (
    AchievementSerializer,
    AdmissionSerializer,
    AnnouncementSerializer,
    ClubSerializer,
    CommentSerializer,
    EventSerializer,
    FacultySerializer,
    IdeaSerializer,
    MembershipSerializer,
    NotificationSerializer,
    ProfileSerializer,
    ProjectSerializer,
)

_ITEM_ERROR = lambda e: {"error": " ".join(getattr(e, "messages", [str(e)]))}


def _read_json(request):
    data = request.data
    if not isinstance(data, dict):
        raise ValidationError("Некорректные данные.")
    return data


class ProfileViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProfileSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["faculty", "specialty", "skills", "interests", "user__first_name", "user__last_name"]

    def get_queryset(self):
        return ProfileRepository.public()

    def retrieve(self, request, *args, **kwargs):
        profile = ProfileRepository.by_id(kwargs["pk"])
        if profile is None:
            return Response({"error": "Профиль не найден или скрыт."}, status=404)
        user = profile.user
        return Response(
            {
                "profile": ProfileSerializer(profile).data,
                "projects": ProjectSerializer(ProjectRepository.for_user(user), many=True).data,
                "clubs": ClubSerializer(ClubRepository.for_user(user), many=True).data,
                "events": EventSerializer(EventRepository.for_user(user), many=True).data,
            }
        )


class OwnedContentViewSet(viewsets.ModelViewSet):
    permission_classes = [PublicReadOwnerWrite]
    owner_field = "owner"

    def perform_create(self, serializer):
        serializer.save(**{self.owner_field: self.request.user})


class ProjectViewSet(OwnedContentViewSet):
    serializer_class = ProjectSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description", "direction", "needed_roles"]
    ordering_fields = ["created_at", "progress"]

    def get_queryset(self):
        return ProjectRepository.newest()

    def retrieve(self, request, *args, **kwargs):
        return _respond_detail(request, "project", kwargs["pk"])

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def join(self, request, pk=None):
        return _action_item(request, "project", pk, "join")

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def leave(self, request, pk=None):
        return _action_item(request, "project", pk, "leave")

    @action(detail=True, methods=["get", "post"], permission_classes=[IsAuthenticatedOrReadOnly])
    def comments(self, request, pk=None):
        return _comments(request, "project", pk)


class IdeaViewSet(OwnedContentViewSet):
    owner_field = "author"
    serializer_class = IdeaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ["created_at", "votes"]
    search_fields = ["title", "description", "official_response"]

    def get_queryset(self):
        return IdeaRepository.top()

    def retrieve(self, request, *args, **kwargs):
        from ..infrastructure.repositories import VoteRepository

        payload = ItemService().detail("idea", kwargs["pk"], request.user)
        if payload is None:
            return Response({"error": "Не найдено."}, status=404)
        return Response(
            {
                "item": IdeaSerializer(payload["item"]).data,
                "comments": CommentSerializer(payload["comments"], many=True).data,
                "is_owner": payload["is_owner"],
                "is_favorited": payload["is_favorited"],
                "voted": VoteRepository.has_voted(request.user, payload["item"]) if request.user.is_authenticated else False,
            }
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def vote(self, request, pk=None):
        try:
            result = VotesService().toggle(pk, request.user)
        except ValidationError as e:
            return Response(_ITEM_ERROR(e), status=400)
        return Response(result)

    @action(detail=True, methods=["get", "post"], permission_classes=[IsAuthenticatedOrReadOnly])
    def comments(self, request, pk=None):
        return _comments(request, "idea", pk)


class ClubViewSet(OwnedContentViewSet):
    owner_field = "lead"
    serializer_class = ClubSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ["created_at"]
    search_fields = ["name", "category", "description"]

    def get_queryset(self):
        return ClubRepository.all()

    def retrieve(self, request, *args, **kwargs):
        return _respond_detail(request, "club", kwargs["pk"])

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def join(self, request, pk=None):
        return _action_item(request, "club", pk, "join")

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def leave(self, request, pk=None):
        return _action_item(request, "club", pk, "leave")

    @action(detail=True, methods=["get", "post"], permission_classes=[IsAuthenticatedOrReadOnly])
    def comments(self, request, pk=None):
        return _comments(request, "club", pk)


class EventViewSet(OwnedContentViewSet):
    owner_field = "organizer"
    serializer_class = EventSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ["created_at", "starts_at"]
    search_fields = ["title", "description", "location"]

    def get_queryset(self):
        return EventRepository.all()

    def retrieve(self, request, *args, **kwargs):
        payload = EventService().detail(kwargs["pk"], request.user)
        if payload is None:
            return Response({"error": "Событие не найдено."}, status=404)
        from .serializers import UserSerializer

        return Response(
            {
                "item": EventSerializer(payload["item"]).data,
                "attendees": UserSerializer(payload["attendees"], many=True).data,
                "attendees_count": payload["attendees_count"],
                "registered": payload["registered"],
                "is_organizer": payload["is_organizer"],
                "reminder": payload["reminder"],
                "is_favorited": payload["is_favorited"],
            }
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def register(self, request, pk=None):
        try:
            EventService().register(pk, request.user)
        except ValidationError as e:
            return Response(_ITEM_ERROR(e), status=400)
        return Response({"ok": True})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        try:
            EventService().cancel(pk, request.user)
        except ValidationError as e:
            return Response(_ITEM_ERROR(e), status=400)
        return Response({"ok": True})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path="reminder")
    def toggle_reminder(self, request, pk=None):
        try:
            added = EventService().toggle_reminder(pk, request.user)
        except ValidationError as e:
            return Response(_ITEM_ERROR(e), status=400)
        return Response({"ok": True, "reminder": added})

    @action(detail=False, methods=["get"], url_path="calendar")
    def calendar(self, request):
        today = timezone.now()
        year = int(request.query_params.get("year", today.year))
        month = int(request.query_params.get("month", today.month))
        events = EventService().calendar(year, month)
        return Response({"year": year, "month": month, "events": EventSerializer(events, many=True).data})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return NotificationRepository.none()
        kind = self.request.query_params.get("kind")
        return NotificationRepository.for_user(self.request.user, kind)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path="read")
    def read(self, request, pk=None):
        notification = self.get_object()
        NotificationRepository.mark_read(notification)
        return Response({"ok": True})

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="read-all")
    def read_all(self, request):
        updated = NotificationRepository.mark_all(request.user)
        return Response({"ok": True, "updated": updated})


class AnnouncementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AnnouncementSerializer

    def get_queryset(self):
        return AnnouncementRepository.published()


def _respond_detail(request, resource: str, resource_id):
    payload = ItemService().detail(resource, resource_id, request.user)
    if payload is None:
        return Response({"error": "Запись не найдена."}, status=404)
    item = payload["item"]
    serializer = {"project": ProjectSerializer, "club": ClubSerializer, "idea": IdeaSerializer}[resource]
    return Response(
        {
            "item": serializer(item).data,
            "members": MembershipSerializer(payload["members"], many=True).data,
            "comments": CommentSerializer(payload["comments"], many=True).data,
            "is_member": payload["is_member"],
            "is_owner": payload["is_owner"],
            "is_favorited": payload["is_favorited"],
        }
    )


def _action_item(request, resource: str, resource_id, action_name: str):
    try:
        ItemService().join(resource, resource_id, request.user) if action_name == "join" else ItemService().leave(
            resource, resource_id, request.user
        )
    except ValidationError as e:
        return Response(_ITEM_ERROR(e), status=400)
    return Response({"ok": True})


def _comments(request, resource: str, resource_id):
    if request.method == "POST":
        text = request.data.get("text", "")
        try:
            comment = ItemService().comment(resource, resource_id, request.user, text)
        except ValidationError as e:
            return Response(_ITEM_ERROR(e), status=400)
        return Response(CommentSerializer(comment).data, status=201)
    return Response(CommentSerializer(CommentRepository.for_resource(resource, resource_id), many=True).data)


@api_view(["GET"])
def dashboard(request):
    payload = DashboardService().payload()
    return Response(
        {
            "stats": payload["stats"],
            "activity": payload["activity"],
            "top_faculties": payload["top_faculties"],
            "directions": payload["directions"],
            "latest_projects": ProjectSerializer(payload["latest_projects"], many=True).data,
            "top_ideas": IdeaSerializer(payload["top_ideas"], many=True).data,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def cabinet(request):
    if not request.user.is_authenticated:
        return Response({"error": "Войдите в аккаунт."}, status=401)
    account = AccountService().account(request.user)
    service = FeedService()
    favorites = FavoritesService().for_user(request.user)
    return Response(
        {
            "account": {
                "profile": ProfileSerializer(account["profile"]).data,
                "can_moderate": account["can_moderate"],
            },
            "projects": ProjectSerializer(ProjectRepository.for_user(request.user), many=True).data,
            "clubs": ClubSerializer(ClubRepository.for_user(request.user), many=True).data,
            "events": EventSerializer(EventRepository.for_user(request.user), many=True).data,
            "ideas": IdeaSerializer(IdeaRepository.for_user(request.user), many=True).data,
            "notifications": NotificationSerializer(NotificationRepository.for_user(request.user), many=True).data,
            "unread_notifications": NotificationRepository.unread_count(request.user),
            "favorites": [
                {
                    "id": entry["favorite"].id,
                    "resource_type": entry["favorite"].resource_type,
                    "resource_id": entry["favorite"].resource_id,
                    "created_at": entry["favorite"].created_at.isoformat(),
                    "item": _serialize_fav_item(entry["favorite"].resource_type, entry["item"]),
                }
                for entry in favorites
            ],
            "achievements": AchievementSerializer(AchievementsService().recent(), many=True).data,
        }
    )


def _serialize_fav_item(resource_type, item):
    serializer = {
        "project": ProjectSerializer,
        "idea": IdeaSerializer,
        "club": ClubSerializer,
        "event": EventSerializer,
    }[resource_type]
    return serializer(item).data


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def favorites(request):
    if request.method == "POST":
        try:
            data = _read_json(request)
            added = FavoritesService().toggle(
                request.user, str(data.get("resource_type", "")), int(data.get("resource_id", 0))
            )
        except (ValidationError, TypeError, ValueError) as e:
            return Response(_ITEM_ERROR(e), status=400)
        return Response({"ok": True, "added": added})
    favorites = FavoritesService().for_user(request.user)
    return Response(
        [
            {
                "id": entry["favorite"].id,
                "resource_type": entry["favorite"].resource_type,
                "resource_id": entry["favorite"].resource_id,
                "created_at": entry["favorite"].created_at.isoformat(),
                "item": _serialize_fav_item(entry["favorite"].resource_type, entry["item"]),
            }
            for entry in favorites
        ]
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def matching(request):
    payload = MatchingService().payload()
    return Response(
        {
            "projects": ProjectSerializer(payload["projects"], many=True).data,
            "people": ProfileSerializer(payload["people"], many=True).data,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def match_apply(request):
    try:
        data = _read_json(request)
        MatchingService().apply(int(data.get("project_id", 0)), request.user, str(data.get("role", "")))
    except (ValidationError, TypeError, ValueError) as e:
        return Response(_ITEM_ERROR(e), status=400)
    return Response({"ok": True})


@api_view(["GET"])
@permission_classes([AllowAny])
def feed(request):
    payload = FeedService().payload()
    return Response(
        {
            "announcements": AnnouncementSerializer(payload["announcements"], many=True).data,
            "events": EventSerializer(payload["events"], many=True).data,
            "projects": ProjectSerializer(payload["projects"], many=True).data,
            "ideas": IdeaSerializer(payload["ideas"], many=True).data,
        }
    )


@api_view(["GET", "POST"])
def achievements(request):
    if request.method == "POST":
        if not AccountService.is_moderator(request.user):
            return Response({"error": "Доступ только для модераторов."}, status=403)
        try:
            data = _read_json(request)
            from django.contrib.auth.models import User

            recipient = User.objects.filter(id=int(data.get("user_id", 0))).first()
            if recipient is None:
                return Response({"error": "Пользователь не найден."}, status=400)
            achievement = AchievementsService().award(recipient, str(data.get("title", "")), str(data.get("icon", "")), request.user)
        except (ValidationError, TypeError, ValueError) as e:
            return Response(_ITEM_ERROR(e), status=400)
        return Response(AchievementSerializer(achievement).data, status=201)
    return Response(AchievementSerializer(AchievementsService().recent(), many=True).data)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def admissions(request):
    if request.method == "POST":
        try:
            data = _read_json(request)
            admission = AdmissionService().create(
                str(data.get("full_name", "")),
                str(data.get("email", "")),
                str(data.get("faculty", "")),
                str(data.get("motivation", "")),
            )
        except (ValidationError, TypeError, ValueError) as e:
            return Response(_ITEM_ERROR(e), status=400)
        return Response(AdmissionSerializer(admission).data, status=201)
    if not AccountService.is_moderator(request.user):
        return Response({"error": "Доступ только для модераторов."}, status=403)
    return Response(AdmissionSerializer(AdmissionService().admission_repo.all(), many=True).data)


@api_view(["GET"])
def faculties(request):
    return Response(ProfileRepository.faculties())


@api_view(["GET"])
@permission_classes([AllowAny])
def faculty_detail(request, name: str):
    service = FacultyService()
    payload = service.detail(name)
    return Response(
        {
            "name": payload["name"],
            "students_count": payload["students_count"],
            "projects_count": payload["projects_count"],
            "clubs_count": payload["clubs_count"],
            "events_count": payload["events_count"],
            "students": ProfileSerializer(payload["students"], many=True).data,
            "projects": ProjectSerializer(payload["projects"], many=True).data,
            "clubs": ClubSerializer(payload["clubs"], many=True).data,
            "events": EventSerializer(payload["events"], many=True).data,
        }
    )


@api_view(["GET"])
def moderation(request):
    service = ModerationService()
    if not service.can_moderate(request.user):
        return Response({"error": "Доступ только для модераторов и администраторов."}, status=403)
    payload = service.payload()
    return Response(
        {
            "projects": ProjectSerializer(payload["projects"], many=True).data,
            "clubs": ClubSerializer(payload["clubs"], many=True).data,
            "ideas": IdeaSerializer(payload["ideas"], many=True).data,
            "admissions": AdmissionSerializer(payload["admissions"], many=True).data,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def moderation_decide(request):
    service = ModerationService()
    if not service.can_moderate(request.user):
        return Response({"error": "Доступ только для модераторов и администраторов."}, status=403)
    try:
        data = _read_json(request)
        service.decide(
            str(data.get("resource", "")),
            int(data.get("resource_id", 0)),
            str(data.get("action", "")),
            request.user,
        )
    except (ValidationError, TypeError, ValueError) as e:
        return Response(_ITEM_ERROR(e), status=400)
    return Response({"ok": True})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_data(request):
    data = ExportService().dump(request.user)
    return HttpResponse(
        json.dumps(data, ensure_ascii=False, indent=2),
        content_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="birge-{request.user.username}.json"'},
    )


ALLOWED_MEDIA_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}


@csrf_protect
@require_http_methods(["POST"])
def upload(request):
    if not AccountService.is_moderator(request.user):
        return JsonResponse({"error": "Доступ только для модераторов и администраторов."}, status=403)
    uploaded = request.FILES.get("file")
    if uploaded is None:
        return JsonResponse({"error": "Файл не передан."}, status=400)
    extension = os.path.splitext(uploaded.name or "")[1].lower()
    if extension not in ALLOWED_MEDIA_EXTENSIONS:
        return JsonResponse({"error": "Недопустимый формат файла."}, status=400)
    filename = uuid.uuid4().hex + extension
    destination = Path(settings.MEDIA_ROOT) / filename
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as out:
        for chunk in uploaded.chunks():
            out.write(chunk)
    url = request.build_absolute_uri(f"{settings.MEDIA_URL}{filename}")
    return JsonResponse({"url": url, "csrf": get_token(request)})