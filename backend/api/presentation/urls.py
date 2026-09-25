from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import auth
from . import passwords
from .views import (
    achievements,
    admissions,
    AnnouncementViewSet,
    cabinet,
    ClubViewSet,
    dashboard,
    export_data,
    faculties,
    faculty_detail,
    favorites,
    feed,
    matching,
    match_apply,
    moderation,
    moderation_decide,
    EventViewSet,
    IdeaViewSet,
    NotificationViewSet,
    ProfileViewSet,
    ProjectViewSet,
    upload,
)

router = DefaultRouter()
router.register("profiles", ProfileViewSet, basename="profile")
router.register("projects", ProjectViewSet, basename="project")
router.register("ideas", IdeaViewSet, basename="idea")
router.register("clubs", ClubViewSet, basename="club")
router.register("events", EventViewSet, basename="event")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("announcements", AnnouncementViewSet, basename="announcement")

urlpatterns = [
    path("auth/password-reset/", passwords.reset_request),
    path("auth/password-reset-confirm/", passwords.reset_confirm),
    path("auth/session/", auth.session),
    path("auth/login/", auth.sign_in),
    path("auth/register/", auth.register),
    path("auth/logout/", auth.sign_out),
    path("auth/me/", auth.me),
    path("cabinet/", cabinet),
    path("favorites/", favorites),
    path("matching/", matching),
    path("matching/apply/", match_apply),
    path("feed/", feed),
    path("achievements/", achievements),
    path("admissions/", admissions),
    path("faculties/", faculties),
    path("faculties/<str:name>/", faculty_detail),
    path("export/", export_data),
    path("moderation/", moderation),
    path("moderation/decide/", moderation_decide),
    path("upload/", upload),
    path("dashboard/", dashboard),
    path("", include(router.urls)),
]