import hashlib
import json
import logging
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import transaction
from django.http import JsonResponse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST


@csrf_protect
@require_POST
def reset_request(request):
    try:
        data = json.loads(request.body)
        email = str(data.get("email", "")).strip()
        validate_email(email)
    except (ValueError, AttributeError, ValidationError):
        return JsonResponse({"error": "Укажите корректный email."}, status=400)
    if not settings.EMAIL_HOST and settings.EMAIL_BACKEND == "django.core.mail.backends.smtp.EmailBackend":
        return JsonResponse({"error": "Отправка писем пока не настроена. Обратитесь к администратору."}, status=503)
    key = "password-reset:" + hashlib.sha256(email.lower().encode()).hexdigest()
    if cache.add(key, True, timeout=60):
        for user in User.objects.filter(email__iexact=email, is_active=True):
            if not user.has_usable_password():
                continue
            query = urlencode({"uid": urlsafe_base64_encode(force_bytes(user.pk)), "token": default_token_generator.make_token(user)})
            url = f"{settings.FRONTEND_URL}/#reset-password?{query}"
            try:
                send_mail("Восстановление пароля BIRGE", f"Для смены пароля откройте ссылку:\n{url}\n\nСсылка действует один час. Если вы не запрашивали смену пароля, проигнорируйте письмо.", settings.DEFAULT_FROM_EMAIL, [user.email])
            except Exception:
                logging.getLogger(__name__).error("Password reset email delivery failed")
    return JsonResponse({"message": "Если аккаунт с таким email существует, письмо придёт в течение нескольких минут."})


@csrf_protect
@require_POST
@transaction.atomic
def reset_confirm(request):
    try:
        data = json.loads(request.body)
        uid = urlsafe_base64_decode(data.get("uid", "")).decode()
        user = User.objects.select_for_update().filter(pk=uid, is_active=True).first()
        if not user or not default_token_generator.check_token(user, data.get("token", "")):
            raise ValidationError("Ссылка недействительна или устарела. Запросите новую.")
        password = data.get("password", "")
        if not isinstance(password, str):
            raise ValidationError("Укажите пароль текстом.")
        validate_password(password, user)
        user.set_password(password)
        user.save(update_fields=["password"])
    except ValidationError as error:
        return JsonResponse({"error": " ".join(error.messages)}, status=400)
    except (ValueError, TypeError, AttributeError, OverflowError):
        return JsonResponse({"error": "Некорректная ссылка."}, status=400)
    return JsonResponse({"message": "Пароль обновлён. Войдите с новым паролем."})
