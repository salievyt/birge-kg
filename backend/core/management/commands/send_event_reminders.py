from django.core.management.base import BaseCommand

from api.application.reminders import dispatch_event_reminders


class Command(BaseCommand):
    help = "Send due in-app event reminders. Safe to run repeatedly."

    def handle(self, *args, **options):
        result = dispatch_event_reminders()
        self.stdout.write(f"Processed {result['processed']}; delivered {result['delivered']}.")
