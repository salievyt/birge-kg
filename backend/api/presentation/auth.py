import json

from django.contrib.auth import login, logout
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods

from ..application.services import AccountService

from .serializers import (
    ClubSerializer,
    EventSerializer,
    NotificationSerializer,
    ProfileSerializer,
    ProjectSerializer,
)


@require_http_methods(["GET"])
def session(request):
    service = AccountService()
    account = service.account(request.user) if request.user.is_authenticated else None
    payload = {"csrf": get_token(request), "account": _serialize_account(account) if account else None}
    return JsonResponse(payload)


@csrf_protect
@require_http_methods(["POST"])
def sign_in(request):
    try:
        data = json.loads(request.body)
    except (ValueError, TypeError):
        return JsonResponse({"error": "Некорректные данные."}, status=400)

    user = AccountService().sign_in(data.get("username", ""), data.get("password", ""))
    if user is None:
        return JsonResponse({"error": "Неверный логин или пароль."}, status=400)
    login(request, user)
    return JsonResponse({"account": _serialize_account(AccountService().account(user)), "csrf": get_token(request)})


@csrf_protect
@require_http_methods(["POST"])
def register(request):
    try:
        data = json.loads(request.body)
        user = AccountService().register(
            username=str(data.get("username", "")).strip(),
            first_name=str(data.get("first_name", "")).strip(),
            password=data.get("password", ""),
            email=str(data.get("email", "")).strip().lower(),
        )
    except ValidationError as error:
        messages = getattr(error, "messages", [str(error)])
        return JsonResponse({"error": " ".join(messages)}, status=400)
    except (ValueError, TypeError):
        return JsonResponse({"error": "Проверьте заполненные поля."}, status=400)

    login(request, user)
    return JsonResponse({"account": _serialize_account(AccountService().account(user)), "csrf": get_token(request)}, status=201)


@csrf_protect
@require_http_methods(["POST"])
def sign_out(request):
    logout(request)
    return JsonResponse({"csrf": get_token(request)})


@csrf_protect
@require_http_methods(["GET", "PATCH"])
def me(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Войдите в аккаунт."}, status=401)

    service = AccountService()
    profile, _ = service.profile_repo.get_or_create(request.user)

    if request.method == "PATCH":
        try:
            data = json.loads(request.body)
        except ValueError:
            return JsonResponse({"error": "Некорректные данные."}, status=400)
        serializer = ProfileSerializer(profile, data=data, partial=True)
        if not serializer.is_valid():
            return JsonResponse({"error": "Проверьте поля профиля.", "fields": serializer.errors}, status=400)
        if "email" in data and data["email"] != request.user.email:
            from django.core.validators import validate_email
            from django.contrib.auth.models import User
            try:
                validate_email(data["email"])
            except (ValidationError, TypeError):
                return JsonResponse({"error": "Укажите корректный email."}, status=400)
            if not request.user.check_password(data.get("current_password", "")):
                return JsonResponse({"error": "Для смены email укажите текущий пароль."}, status=400)
            if User.objects.filter(email__iexact=data["email"]).exclude(pk=request.user.pk).exists():
                return JsonResponse({"error": "Этот email уже используется."}, status=400)
            request.user.email = data["email"].strip().lower()
            request.user.save(update_fields=["email"])
        serializer.save()

    payload = service.personal_cabinet(request.user)
    return JsonResponse(
        {
            **_serialize_account(payload["account"]),
            "projects": ProjectSerializer(payload["projects"], many=True).data,
            "clubs": ClubSerializer(payload["clubs"], many=True).data,
            "events": EventSerializer(payload["events"], many=True).data,
            "notifications": NotificationSerializer(payload["notifications"], many=True).data,
        }
    )


def _serialize_account(account):
    profile = ProfileSerializer(account["profile"]).data
    profile["email"] = account["profile"].user.email
    return {"profile": profile, "can_moderate": account["can_moderate"]}
