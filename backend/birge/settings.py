import os
import urllib.parse
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Локальный .env (DATABASE_URL и т.д.) никогда не попадает в git.
# На Vercel переменные приходят от платформы, override не трогаем.
load_dotenv(BASE_DIR / ".env")


def _csv(name: str) -> list[str]:
    return [part.strip() for part in os.environ.get(name, "").split(",") if part.strip()]


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-birge-secret-key")

# Локальная разработка по умолчанию включает DEBUG; на Vercel выставляйте DJANGO_DEBUG=0.
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"

FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://birge.deo-core.codes",
    "https://birge.backend.deo-core.codes",
]

ALLOWED_HOSTS = [
    "127.0.0.1",
    "localhost",
    "birge.deo-core.codes",
    "birge.backend.deo-core.codes",
    *_csv("DJANGO_ALLOWED_HOSTS"),  # e.g. <project>.vercel.app
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "core",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "birge.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "birge.wsgi.application"

# Автомиграция на Vercel: в Build Command выполняется `python manage.py migrate --noinput`.
# Для сохранения данных продакшен должен использовать Postgres через DATABASE_URL
# (Neon/Supabase/база Vercel). Локально — SQLite (если DATABASE_URL не задан).
if os.environ.get("DATABASE_URL"):
    _db_url = urllib.parse.urlparse(os.environ["DATABASE_URL"])
    _db_options = dict(part.split("=", 1) for part in _db_url.query.split("&") if "=" in part)
    if _db_url.hostname and not any(h in _db_url.hostname for h in ("localhost", "127.0.0.1")):
        _db_options.setdefault("sslmode", "require")
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": _db_url.path.lstrip("/"),
            "USER": _db_url.username,
            "PASSWORD": _db_url.password,
            "HOST": _db_url.hostname or "",
            "PORT": _db_url.port or "",
            "OPTIONS": _db_options,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Asia/Bishkek"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "static"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [*FRONTEND_ORIGINS, *_csv("DJANGO_CORS_ORIGINS")]

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["api.permissions.PublicReadStaffWrite"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
CSRF_TRUSTED_ORIGINS = [*FRONTEND_ORIGINS, *_csv("DJANGO_TRUSTED_ORIGINS")]

# Фронтенд ходит на бэкенд через server-side прокси своего домена (birge.deo-core.codes).
# Чтобы session/csrf-cookie из ответов бэкенда доходили до браузера по домену фронтенда,
# выставляем общий cookie-домен родителя *.deo-core.codes (только в проде, via env).
_cookie_domain = os.environ.get("DJANGO_COOKIE_DOMAIN", "").strip() or None
SESSION_COOKIE_DOMAIN = _cookie_domain
CSRF_COOKIE_DOMAIN = _cookie_domain
SESSION_COOKIE_SECURE = bool(_cookie_domain)
CSRF_COOKIE_SECURE = bool(_cookie_domain)
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SAMESITE = "Lax"