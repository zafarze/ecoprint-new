from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'orders', views.OrderViewSet, basename='order')
router.register(r'items', views.ItemViewSet, basename='item')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    # Кастомные пути (обязательно ДО роутера)
    path('statistics-data/', views.statistics_data_view, name='app-statistics-data'),
    path('sync-sheets/', views.sync_to_google_sheets, name='app-sync-sheets'),
    path('ai-chat/', views.chat_with_ai, name='app-ai-chat'),
    
    # Стандартный CRUD
    path('', include(router.urls)),
]