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
REMINDER_JOB_SECRET = os.environ.get("REMINDER_JOB_SECRET", "")

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
    "jazzmin",
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

# Админ-тема Jazzmin — только светлая тема, тёмная отключена.
JAZZMIN_SETTINGS = {
    "site_title": "BIRGE — администратор",
    "site_header": "BIRGE",
    "site_brand": "BIRGE",
    "welcome_sign": "Вход в админ-панель BIRGE",
    "copyright": "BIRGE © ОшТУ",
    "theme": "default",
    "default_theme_mode": "light",
    "show_theme_chooser": False,
    "show_ui_builder": False,
    "changeform_format": "horizontal_tabs",
    "icons": {
        "core": "fas fa-university",
        "core.Profile": "fas fa-user-circle",
        "core.Project": "fas fa-project-diagram",
        "core.Idea": "fas fa-lightbulb",
        "core.Club": "fas fa-users",
        "core.Event": "fas fa-calendar-alt",
        "core.Announcement": "fas fa-bullhorn",
        "core.Comment": "fas fa-comment-dots",
        "core.Vote": "fas fa-vote-yea",
        "core.Favorite": "fas fa-star",
        "core.Notification": "fas fa-bell",
        "core.Achievement": "fas fa-trophy",
        "core.AdmissionRequest": "fas fa-file-signature",
        "core.EventReminder": "fas fa-bell",
        "core.ProjectMembership": "fas fa-user-tag",
        "auth.User": "fas fa-user",
        "auth.Group": "fas fa-users-cog",
    },
    "order_with_respect_to": ["core", "auth"],
}

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
    _db_options = dict(urllib.parse.parse_qsl(_db_url.query))
    _db_options.setdefault("connect_timeout", 15)
    if _db_url.hostname and not any(h in _db_url.hostname for h in ("localhost", "127.0.0.1")):
        _db_options.setdefault("sslmode", "require")
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": urllib.parse.unquote(_db_url.path.lstrip("/")),
            "USER": urllib.parse.unquote(_db_url.username or ""),
            "PASSWORD": urllib.parse.unquote(_db_url.password or ""),
            "HOST": _db_url.hostname or "",
            "PORT": _db_url.port or "",
            "OPTIONS": _db_options,
            "CONN_MAX_AGE": 0,
            "DISABLE_SERVER_SIDE_CURSORS": True,
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
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://birge.deo-core.codes").rstrip("/")
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "0") == "1"
EMAIL_USE_TLS = not EMAIL_USE_SSL and os.environ.get("EMAIL_USE_TLS", "1") == "1"
EMAIL_TIMEOUT = 10
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "BIRGE <noreply@deo-core.codes>")
PASSWORD_RESET_TIMEOUT = 3600
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
