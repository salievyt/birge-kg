import os
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


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
# (Neon/Supabase/база Vercel). Локально — SQLite.
if os.environ.get("DATABASE_URL"):
    _db_url = urllib.parse.urlparse(os.environ["DATABASE_URL"])
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": _db_url.path.lstrip("/"),
            "USER": _db_url.username,
            "PASSWORD": _db_url.password,
            "HOST": _db_url.hostname or "",
            "PORT": _db_url.port or "",
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