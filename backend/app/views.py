import os
import threading
import gspread
from datetime import date, timedelta
from .models import Order, Item, Product, CompanySettings, TelegramSettings, OrderHistory
from django.db import transaction  # 🔥 ДОБАВЛЕНО: для защиты базы данных (транзакции)
from django.utils import timezone
from django.conf import settings
from django.db.models import Min, F, Count
from django.db.models.functions import TruncDate, TruncMonth
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.contrib.auth.models import User

from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .ai_service import ask_gemini
from .models import Order, Item, Product, CompanySettings, TelegramSettings

from .serializers import (
    OrderSerializer, OrderListSerializer, ProductSerializer, UserSimpleSerializer, 
    ItemSerializer, ItemWriteSerializer, CustomTokenObtainPairSerializer,
    CompanySettingsSerializer, TelegramSettingsSerializer
)
from .telegram_bot import send_telegram_notification

from .permissions import IsSuperAdmin, IsManagerOrAdmin

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class OrderViewSet(viewsets.ModelViewSet):
    # По умолчанию пускаем всех авторизованных (на чтение)
    permission_classes = [IsAuthenticated]  

    def get_permissions(self):
        # Удалять заказ может строго супер-админ
        if self.action in ['destroy']:
            return [IsSuperAdmin()]
        # Создавать, менять, архивировать заказы может Менеджер и Админ
        elif self.action in ['create', 'update', 'partial_update', 'archive', 'unarchive', 'trigger_auto_archive']:
            return [IsManagerOrAdmin()]
        return super().get_permissions()
    pagination_class = None  # 🔥 ОПТИМИЗАЦИЯ: Фронтенд сам фильтрует и пагинирует

    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer 
        return OrderSerializer

    def get_queryset(self):
        # 🔥 ОПТИМИЗАЦИЯ: Убрали тяжелую сортировку annotate(min_deadline=Min())
        # Причина: React сам всё сортирует. Это экономит СЕКУНДЫ времени БД!
        queryset = Order.objects.all().order_by('-id')
        
        is_archived = self.request.query_params.get('is_archived', None)
        if is_archived is not None:
            is_archived_bool = is_archived.lower() == 'true'
            queryset = queryset.filter(is_archived=is_archived_bool)
            
        # 🔥 ОПТИМИЗАЦИЯ: Погружаем историю ТОЛЬКО при открытии 1 заказа, а не для всего списка
        from django.db.models import Prefetch
        from .models import Item, OrderHistory
        
        prefetches = [Prefetch('items', queryset=Item.objects.select_related('responsible_user'))]
        
        if getattr(self, 'action', '') != 'list':
            prefetches.append(Prefetch('history', queryset=OrderHistory.objects.select_related('user')))
            
        return queryset.prefetch_related(*prefetches)

    def get_serializer_context(self):
        context = super().get_serializer_context() 
        context['show_archived'] = self.request.query_params.get('is_archived') == 'true'
        return context

    def perform_create(self, serializer):
        order = serializer.save()
        # 🔥 ИСПРАВЛЕНО: Отправка в Telegram работает в фоне, ускоряя ответ сервера клиенту
        try:
            threading.Thread(target=send_telegram_notification, args=(order,)).start()
        except Exception as e:
            print(f"Ошибка запуска потока Telegram: {e}")

    @action(detail=False, methods=['post'])
    def trigger_auto_archive(self, request):
        # 1. Считаем дату: ровно 3 дня назад от текущего момента
        three_days_ago = timezone.now() - timedelta(days=3)
        
        # 2. Ищем заказы: не в архиве, ВЫДАНЫ клиенту и дата выдачи старше 3 дней
        orders_to_archive = Order.objects.filter(
            is_archived=False, 
            is_received=True, 
            received_at__lte=three_days_ago
        )
        
        # Собираем ID этих заказов, чтобы заархивировать и сами заказы, и их товары
        order_ids = list(orders_to_archive.values_list('id', flat=True))
        
        if order_ids:
            # Безопасная транзакция: архивируем всё разом
            with transaction.atomic():
                Order.objects.filter(id__in=order_ids).update(is_archived=True)
                Item.objects.filter(order_id__in=order_ids).update(is_archived=True)
                
        return Response({
            'status': 'success', 
            'message': f'{len(order_ids)} заказов автоматически отправлено в архив.'
        })

    def partial_update(self, request, *args, **kwargs):
        # 🔥 Авто-проставляем received_at при выдаче заказа
        if 'is_received' in request.data:
            if request.data['is_received'] in [True, 'true', 1]:
                request.data['received_at'] = timezone.now().isoformat()
            else:
                request.data['received_at'] = None
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        try:
            order = self.get_object()
            with transaction.atomic():
                # 🔥 Моментально прячем сам заказ
                order.is_archived = True
                order.save(update_fields=['is_archived'])
                
                # И прячем все товары внутри него
                c = order.items.filter(is_archived=False).update(is_archived=True)
                order.update_status() 
            return Response({'status': 'success', 'message': f'Заказ и {c} товаров архивированы.'})
        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        try:
            order = self.get_object()
            with transaction.atomic():
                # 🔥 Моментально возвращаем сам заказ
                order.is_archived = False
                order.save(update_fields=['is_archived'])
                
                # И возвращаем его товары
                c = order.items.filter(is_archived=True).update(is_archived=False)
                order.update_status()
            return Response({'status': 'success', 'message': f'Заказ и {c} товаров восстановлены.'})
        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=400)


class ItemViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]  
    queryset = Item.objects.all()

    def get_permissions(self):
        # Удалять товары внутри заказа может только менеджер или админ
        if self.action in ['destroy']:
            return [IsManagerOrAdmin()]
        # Любой авторизованный (в т.ч. работник) может менять статус (partial_update)
        return super().get_permissions()

    def get_serializer_class(self):
        if self.request.method in ['POST', 'PUT', 'PATCH']:
            return ItemWriteSerializer
        return ItemSerializer

    def perform_update(self, serializer):
        new_status = serializer.validated_data.get('status')
        item = serializer.save()
        
        # 🔥 ДОБАВЛЕНО: Логируем быстрые клики по статусам из таблицы
        if new_status:
            request = self.request
            user = request.user if request and request.user.is_authenticated else None
            OrderHistory.objects.create(
                order=item.order,
                user=user,
                message=f"Изменил статус '{item.name}' на '{item.get_status_display()}'"
            )

        if hasattr(item.order, 'update_status'):
            item.order.update_status()


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]  
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer
    pagination_class = None 
    
    def get_permissions(self):
        # Читать каталог (list) могут все авторизованные (работник тоже, если вдруг),
        # но управлять товарами могут только менеджеры и админы.
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAdmin()]
        return super().get_permissions()
    
    @method_decorator(never_cache)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSuperAdmin] # 🔥 Строго для админа
    queryset = User.objects.filter(is_active=True).order_by('first_name')
    serializer_class = UserSimpleSerializer
    pagination_class = None


@api_view(['POST'])
@permission_classes([IsAuthenticated])  # 🔥 ИСПРАВЛЕНО: Защита эндпоинта ИИ
def chat_with_ai(request):
    question = request.data.get('message', '')
    if not question:
        return Response({'error': 'Пустой вопрос'}, status=400)
    answer = ask_gemini(question)
    return Response({'answer': answer})


@api_view(['GET'])
@permission_classes([IsSuperAdmin]) # 🔥 Графики и аналитика строго для админа (и может быть менеджера, но пока админу)
def statistics_data_view(request):
    period = request.query_params.get('period', 'week')
    if not request.user.is_superuser:
        period = 'week'
    
    today = timezone.now().date()
    
    if period == 'month':
        start_date = today - timedelta(days=29)
    elif period == 'year':
        start_month = today.month + 1
        start_year = today.year - 1
        if start_month > 12:
            start_month -= 12
            start_year += 1
        start_date = date(start_year, start_month, 1)
    else: 
        start_date = today - timedelta(days=6)
        period = 'week'

    from collections import Counter
    # 🔥 ОПТИМИЗАЦИЯ ГОДА: Убрали 6 медленных SQL-запросов (Count). 
    # Теперь делаем 2 легчайших запроса и считаем статистику в памяти Python мгновенно!
    
    # 1. Быстро достаем сырые данные
    orders_data = list(Order.objects.filter(created_at__gte=start_date).values('status', 'created_at'))
    
    total_orders = len(orders_data)
    pending_orders = sum(1 for o in orders_data if o['status'] == 'in-progress')
    
    # Переводим UTC время в локальное для правильного подсчета дней
    local_dates = [timezone.localtime(o['created_at']).date() for o in orders_data]
    created_today = sum(1 for d in local_dates if d >= today)
    
    # Подсчет статусов
    status_counter = Counter(o['status'] for o in orders_data)
    status_data = {
        'labels': list(status_counter.keys()),
        'counts': list(status_counter.values()),
    }

    # 2. Вытаскиваем названия товаров для топа
    items_data = list(Item.objects.filter(order__created_at__gte=start_date).values_list('name', flat=True))
    top_product_name = "Нет данных"
    if items_data:
        items_counter = Counter(items_data)
        top_product_name = items_counter.most_common(1)[0][0]

    # Подсчет динамики
    dynamics_data = []
    
    if period in ['week', 'month']:
        date_counter = Counter(local_dates)
        days_count = 7 if period == 'week' else 30
        
        for i in range(days_count - 1, -1, -1):
            d = today - timedelta(days=i)
            if period == 'week':
                weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
                name = weekdays[d.weekday()]
            else:
                name = d.strftime('%d.%m')
                
            dynamics_data.append({'name': name, 'orders': date_counter.get(d, 0)})
            
    elif period == 'year':
        month_counter = Counter(date(d.year, d.month, 1) for d in local_dates)
        
        for i in range(11, -1, -1):
            m = today.month - i
            y = today.year
            if m <= 0:
                m += 12
                y -= 1
            target_month = date(y, m, 1)
            months_ru = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
            
            dynamics_data.append({'name': f"{months_ru[m-1]}", 'orders': month_counter.get(target_month, 0)})

    return Response({
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'created_today': created_today,
        'top_product': top_product_name,
        'status_counts': status_data,
        'dynamics_data': dynamics_data,
    })


@api_view(['POST'])
@permission_classes([IsManagerOrAdmin]) # 🔥 Синхронизация для менеджеров и админов
def sync_to_google_sheets(request):
    try:
        import json
        google_creds_json = os.environ.get('GOOGLE_CREDS_JSON')
        if google_creds_json:
            creds_dict = json.loads(google_creds_json)
            gc = gspread.service_account_from_dict(creds_dict)
        else:
            service_account_path = os.path.join(settings.BASE_DIR, 'service_account.json')
            if not os.path.exists(service_account_path):
                return Response({'error': 'Файл service_account.json не найден!'}, status=400)
            gc = gspread.service_account(filename=service_account_path)
            
        sheet_id = os.environ.get('GOOGLE_SHEET_ID')
        
        if not sheet_id:
             sheet_name = os.environ.get('GOOGLE_SHEET_NAME', 'EcoPrint Orders')
             try:
                 sh = gc.open(sheet_name)
             except gspread.SpreadsheetNotFound:
                 return Response({'error': f'Таблица "{sheet_name}" не найдена.'}, status=404)
        else:
             sh = gc.open_by_key(sheet_id)
        
        worksheet = sh.sheet1 
        cutoff_date = timezone.now() - timedelta(days=90)
        orders = Order.objects.filter(created_at__gte=cutoff_date).prefetch_related('items__responsible_user').order_by('-created_at')
        
        data = [['ID', 'Клиент', 'Дата', 'Статус заказа', 'Товар', 'Кол-во', 'Дедлайн', 'Статус товара', 'Ответственный', 'Комментарий']]

        # 🔥 ИСПРАВЛЕНО: iterator() защищает от переполнения оперативной памяти сервера
        for order in orders.iterator(chunk_size=1000):
            created_date = order.created_at.strftime("%d.%m.%Y %H:%M")
            if not order.items.exists():
                data.append([order.id, order.client, created_date, order.get_status_display(), "-", "-", "-", "-", "-", "-"])
                continue

            for item in order.items.all():
                resp_user = "Нет"
                if item.responsible_user:
                    resp_user = item.responsible_user.first_name or item.responsible_user.username
                deadline = item.deadline.strftime("%d.%m.%Y") if item.deadline else "-"
                row = [order.id, order.client, created_date, order.get_status_display(), item.name, item.quantity, deadline, item.get_status_display(), resp_user, item.comment]
                data.append(row)

        worksheet.clear()
        worksheet.update(data)
        return Response({'status': 'success', 'message': f'Выгружены заказы за 90 дней. Строк: {len(data)-1}'})

    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST', 'GET'])
@permission_classes([permissions.AllowAny])
def sync_sheets_webhook(request):
    """
    Вебхук для автоматического запуска (например, через Google Cloud Scheduler).
    Не требует JWT токена менеджера, требует только секретный ключ.
    """
    secret = request.GET.get('secret')
    expected_secret = os.environ.get('CRON_SECRET', 'ecoprint_secret_cron_job_2026')
    
    if secret != expected_secret:
        return Response({'error': 'Invalid secret key'}, status=403)
        
    # Код синхронизации аналогичен верхней функции
    try:
        import json
        google_creds_json = os.environ.get('GOOGLE_CREDS_JSON')
        if google_creds_json:
            creds_dict = json.loads(google_creds_json)
            gc = gspread.service_account_from_dict(creds_dict)
        else:
            service_account_path = os.path.join(settings.BASE_DIR, 'service_account.json')
            if not os.path.exists(service_account_path):
                return Response({'error': 'Файл service_account.json не найден!'}, status=400)
            gc = gspread.service_account(filename=service_account_path)
            
        sheet_id = os.environ.get('GOOGLE_SHEET_ID')
        
        if not sheet_id:
             sheet_name = os.environ.get('GOOGLE_SHEET_NAME', 'EcoPrint Orders')
             try:
                 sh = gc.open(sheet_name)
             except gspread.SpreadsheetNotFound:
                 return Response({'error': f'Таблица "{sheet_name}" не найдена.'}, status=404)
        else:
             sh = gc.open_by_key(sheet_id)
        
        worksheet = sh.sheet1 
        cutoff_date = timezone.now() - timedelta(days=90)
        orders = Order.objects.filter(created_at__gte=cutoff_date).prefetch_related('items__responsible_user').order_by('-created_at')
        
        data = [['ID', 'Клиент', 'Дата', 'Статус заказа', 'Товар', 'Кол-во', 'Дедлайн', 'Статус товара', 'Ответственный', 'Комментарий']]

        for order in orders.iterator(chunk_size=1000):
            created_date = order.created_at.strftime("%d.%m.%Y %H:%M")
            if not order.items.exists():
                data.append([order.id, order.client, created_date, order.get_status_display(), "-", "-", "-", "-", "-", "-"])
                continue

            for item in order.items.all():
                resp_user = "Нет"
                if item.responsible_user:
                    resp_user = item.responsible_user.first_name or item.responsible_user.username
                deadline = item.deadline.strftime("%d.%m.%Y") if item.deadline else "-"
                row = [order.id, order.client, created_date, order.get_status_display(), item.name, item.quantity, deadline, item.get_status_display(), resp_user, item.comment]
                data.append(row)

        worksheet.clear()
        worksheet.update(data)
        return Response({'status': 'success', 'message': f'Авто-выгрузка успешна. Строк: {len(data)-1}'})

    except Exception as e:
        return Response({'error': str(e)}, status=500)

class CompanySettingsAPIView(APIView):
    permission_classes = [IsSuperAdmin] # 🔥 Доступ к настройкам компании только у админа
    
    def get(self, request):
        obj, _ = CompanySettings.objects.get_or_create(id=1)
        return Response(CompanySettingsSerializer(obj).data)

    def put(self, request):
        obj, _ = CompanySettings.objects.get_or_create(id=1)
        serializer = CompanySettingsSerializer(obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class TelegramSettingsAPIView(APIView):
    permission_classes = [IsSuperAdmin] # 🔥 Доступ к Telegram настройкам только у админа
    
    def get(self, request):
        obj, _ = TelegramSettings.objects.get_or_create(id=1)
        return Response(TelegramSettingsSerializer(obj).data)

    def put(self, request):
        obj, _ = TelegramSettings.objects.get_or_create(id=1)
        serializer = TelegramSettingsSerializer(obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])  # 🔥 ИСПРАВЛЕНО
def header_stats(request):
    from django.db.models import Count, Q
    
    today = timezone.now().date()
    tomorrow = today + timedelta(days=1)

    # Ищем только активные товары (заказ не выдан, не в архиве, товар НЕ готов)
    active_items = Item.objects.filter(
        order__is_archived=False, 
        order__is_received=False
    ).exclude(status='ready')
    
    # 🔥 ОПТИМИЗАЦИЯ: Агрегируем 3 разных count() в ОДИН запрос для ускорения ответа из облака
    stats = active_items.aggregate(
        today_count=Count('order', filter=Q(deadline=today), distinct=True),
        tomorrow_count=Count('order', filter=Q(deadline=tomorrow), distinct=True),
        overdue_count=Count('order', filter=Q(deadline__lt=today), distinct=True)
    )

    return Response({
        'today': stats['today_count'] or 0,
        'tomorrow': stats['tomorrow_count'] or 0,
        'overdue': stats['overdue_count'] or 0
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    new_password = request.data.get('new_password')
    
    if not new_password:
        return Response({'error': 'Необходимо указать новый пароль'}, status=status.HTTP_400_BAD_REQUEST)
        
    if len(new_password) < 6:
        return Response({'error': 'Новый пароль должен быть не менее 6 символов'}, status=status.HTTP_400_BAD_REQUEST)
        
    user.set_password(new_password)
    user.save()
    return Response({'message': 'Пароль успешно изменен'}, status=status.HTTP_200_OK)
