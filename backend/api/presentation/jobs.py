from django.conf import settings
from django.http import JsonResponse
from django.utils.crypto import constant_time_compare
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from ..application.reminders import dispatch_event_reminders


@csrf_exempt
@require_POST
def event_reminders(request):
    secret = settings.REMINDER_JOB_SECRET
    if not secret:
        return JsonResponse({"error": "Scheduler is not configured."}, status=503)
    if not constant_time_compare(request.headers.get("Authorization", ""), f"Bearer {secret}"):
        return JsonResponse({"error": "Unauthorized."}, status=401)
    response = JsonResponse(dispatch_event_reminders())
    response["Cache-Control"] = "no-store"
    return response
