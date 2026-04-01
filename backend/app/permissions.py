from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """ Разрешает доступ только супер-администраторам """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user.profile, 'role', 'worker') if hasattr(request.user, 'profile') else 'worker'
        return request.user.is_superuser or role == 'superadmin'

class IsManagerOrAdmin(permissions.BasePermission):
    """ Разрешает доступ менеджерам и суперадминам """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user.profile, 'role', 'worker') if hasattr(request.user, 'profile') else 'worker'
        return request.user.is_superuser or role in ['superadmin', 'manager']
