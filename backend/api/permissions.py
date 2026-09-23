from rest_framework.permissions import SAFE_METHODS, BasePermission

from .application.services import AccountService


class PublicReadStaffWrite(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or AccountService.is_moderator(request.user)