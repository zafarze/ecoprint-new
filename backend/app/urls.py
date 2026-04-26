from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView # <--- Импортируем стандартный рефреш
from . import views

router = DefaultRouter()
router.register(r'orders', views.OrderViewSet, basename='order')
router.register(r'items', views.ItemViewSet, basename='item')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    # ==========================================
    # JWT АВТОРИЗАЦИЯ
    # ==========================================
    # Обрати внимание: если этот файл подключается в главном urls.py проекта 
    # с префиксом 'api/', то итоговый путь будет как раз 'api/token/'
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # ==========================================
    # КАСТОМНЫЕ ПУТИ (обязательно ДО роутера)
    # ==========================================
    # 🔥 НОВЫЙ ПУТЬ ДЛЯ СТАТИСТИКИ ХЕДЕРА
    path('header-stats/', views.header_stats, name='app-header-stats'),
    
    path('statistics-data/', views.statistics_data_view, name='app-statistics-data'),
    path('sync-sheets/', views.sync_to_google_sheets, name='app-sync-sheets'),
    path('webhook-sync-sheets/', views.sync_sheets_webhook, name='app-webhook-sync-sheets'),
    path('webhook-daily-reminders/', views.webhook_daily_reminders, name='app-webhook-daily-reminders'),
    path('ai-chat/', views.chat_with_ai, name='app-ai-chat'),

    # Глобальное состояние системы для мгновенных обновлений
    path('system-state/', views.system_state_view, name='app-system-state'),
    
    # Пути настроек теперь находятся там, где нужно:
    path('settings/company/', views.CompanySettingsAPIView.as_view(), name='app-settings-company'),
    path('settings/telegram/', views.TelegramSettingsAPIView.as_view(), name='app-settings-telegram'),
    path('settings/telegram/test/', views.test_telegram_message, name='app-settings-telegram-test'),
    path('settings/notifications/', views.notification_settings, name='app-settings-notifications'),
    
    path('profile/change-password/', views.change_password, name='app-change-password'),
    path('profile/upload-avatar/', views.upload_avatar, name='app-upload-avatar'),
    path('profile/me/', views.get_profile, name='app-get-profile'),
    path('profile/update/', views.update_profile, name='app-update-profile'),
    path('orders/poll/', views.poll_new_orders, name='app-poll-orders'),
    
    # ==========================================
    # СТАНДАРТНЫЙ CRUD
    # ==========================================
    # Роутер оставлен в самом конце, чтобы пропускать кастомные пути
    path('', include(router.urls)),
]