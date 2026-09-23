from django.contrib import admin

from .models import Announcement, Club, Event, Idea, Notification, Profile, Project, ProjectMembership


admin.site.register(Profile)
admin.site.register(Project)
admin.site.register(ProjectMembership)
admin.site.register(Idea)
admin.site.register(Club)
admin.site.register(Event)
admin.site.register(Notification)
admin.site.register(Announcement)
