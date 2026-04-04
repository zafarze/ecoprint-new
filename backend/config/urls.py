from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Твое основное приложение app (включает в себя кастомный token view)
    path('api/', include('app.urls')),
]