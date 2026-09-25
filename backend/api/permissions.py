from rest_framework.permissions import SAFE_METHODS, BasePermission

from .application.services import AccountService


class PublicReadStaffWrite(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or AccountService.is_moderator(request.user)


class PublicReadOwnerWrite(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return (request.method in SAFE_METHODS or AccountService.is_moderator(request.user)
                or getattr(obj, view.owner_field + "_id", None) == request.user.id)
