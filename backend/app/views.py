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

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class IsAdminOrCantDelete(BasePermission):
    def has_permission(self, request, view):
        if view.action == 'destroy':
            return request.user.is_superuser
        return True

class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]  # 🔥 ИСПРАВЛЕНО: Защита эндпоинта включена

    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer 
        return OrderSerializer

    def get_queryset(self):
        queryset = Order.objects.all().annotate(
            min_deadline=Min('items__deadline')
        ).order_by(F('min_deadline').asc(nulls_last=True), '-created_at')
        
        is_archived = self.request.query_params.get('is_archived', None)
        if is_archived is not None:
            is_archived_bool = is_archived.lower() == 'true'
            queryset = queryset.filter(is_archived=is_archived_bool)
            
        # 🔥 ИСПРАВЛЕНО: Теперь история всегда подгружается вместе с заказами
        return queryset.prefetch_related('items__responsible_user', 'history__user')

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
    permission_classes = [IsAuthenticated]  # 🔥 ИСПРАВЛЕНО
    queryset = Item.objects.all()

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
    permission_classes = [IsAuthenticated]  # 🔥 ИСПРАВЛЕНО
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer
    pagination_class = None 
    
    @method_decorator(never_cache)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]  # 🔥 ИСПРАВЛЕНО
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
@permission_classes([IsAuthenticated])  # 🔥 ИСПРАВЛЕНО
def statistics_data_view(request):
    period = request.query_params.get('period', 'week')
    if not request.user.is_superuser:
        period = 'week'
    
    today = timezone.now().date()
    start_date = today
    
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

    orders_in_period = Order.objects.filter(created_at__gte=start_date)
    total_orders = orders_in_period.count()
    pending_orders = orders_in_period.filter(status='in-progress').count()
    created_today = Order.objects.filter(created_at__gte=today).count()
    
    top_product_query = Item.objects.filter(
        order__created_at__gte=start_date
    ).values('name').annotate(name_count=Count('name')).order_by('-name_count').first()
    
    top_product_name = top_product_query['name'] if top_product_query else "Нет данных"

    status_counts_query = orders_in_period.values('status').annotate(count=Count('status')).order_by('status')
    status_data = {
        'labels': [item['status'] for item in status_counts_query],
        'counts': [item['count'] for item in status_counts_query],
    }

    dynamics_data = []
    if period in ['week', 'month']:
        daily_counts = orders_in_period.annotate(date=TruncDate('created_at')).values('date').annotate(count=Count('id'))
        counts_dict = {item['date']: item['count'] for item in daily_counts}
        
        days_count = 7 if period == 'week' else 30
        for i in range(days_count - 1, -1, -1):
            d = today - timedelta(days=i)
            if period == 'week':
                weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
                name = weekdays[d.weekday()]
            else:
                name = d.strftime('%d.%m')
                
            dynamics_data.append({'name': name, 'orders': counts_dict.get(d, 0)})
            
    elif period == 'year':
        monthly_counts = orders_in_period.annotate(month=TruncMonth('created_at')).values('month').annotate(count=Count('id'))
        month_dict = {item['month'].date() if hasattr(item['month'], 'date') else item['month']: item['count'] for item in monthly_counts}
        
        for i in range(11, -1, -1):
            m = today.month - i
            y = today.year
            if m <= 0:
                m += 12
                y -= 1
            target_month = date(y, m, 1)
            months_ru = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
            
            dynamics_data.append({'name': f"{months_ru[m-1]}", 'orders': month_dict.get(target_month, 0)})

    return Response({
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'created_today': created_today,
        'top_product': top_product_name,
        'status_counts': status_data,
        'dynamics_data': dynamics_data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])  # 🔥 ИСПРАВЛЕНО
def sync_to_google_sheets(request):
    try:
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


class CompanySettingsAPIView(APIView):
    permission_classes = [IsAuthenticated]  # 🔥 ИСПРАВЛЕНО
    
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
    permission_classes = [IsAuthenticated]  # 🔥 ИСПРАВЛЕНО
    
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
    today = timezone.now().date()
    tomorrow = today + timedelta(days=1)

    # Ищем только активные товары (заказ не выдан, не в архиве, товар НЕ готов)
    active_items = Item.objects.filter(
        order__is_archived=False, 
        order__is_received=False
    ).exclude(status='ready')
    
    today_count = active_items.filter(deadline=today).values('order').distinct().count()
    tomorrow_count = active_items.filter(deadline=tomorrow).values('order').distinct().count()
    
    overdue_count = active_items.filter(deadline__lt=today).values('order').distinct().count()

    return Response({
        'today': today_count,
        'tomorrow': tomorrow_count,
        'overdue': overdue_count
    })