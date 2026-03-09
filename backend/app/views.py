import os
from datetime import date, timedelta
from django.utils import timezone
from django.conf import settings
from django.db.models import Min, F, Count
from django.db.models.functions import TruncDate, TruncMonth
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.contrib.auth.models import User
from .ai_service import ask_gemini

from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, IsAuthenticated

from .models import Order, Item, Product
from .serializers import OrderSerializer, ProductSerializer, UserSimpleSerializer, ItemSerializer, ItemWriteSerializer
from .telegram_bot import send_telegram_notification

# ЗАКОММЕНТИРОВАНО: Пока мы не перенесли файл ai_service.py
# from .ai_service import ask_gemini 

# ЗАКОММЕНТИРОВАНО: Пока не установим библиотеку gspread
# import gspread 

# ==========================================
# 1. PERMISSIONS (ПРАВА ДОСТУПА)
# ==========================================
class IsAdminOrCantDelete(BasePermission):
    def has_permission(self, request, view):
        if view.action == 'destroy':
            return request.user.is_superuser
        return True

# ==========================================
# 2. VIEWSETS (ОСНОВНОЙ CRUD API)
# ==========================================
class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsAdminOrCantDelete]

    def get_queryset(self):
        queryset = Order.objects.all()
        is_archived = self.request.query_params.get('is_archived')
        
        if is_archived == 'true':
            queryset = queryset.filter(items__is_archived=True)
        elif is_archived == 'false':
            queryset = queryset.filter(items__is_archived=False)
        
        queryset = queryset.annotate(earliest_deadline=Min('items__deadline'))
        return queryset.distinct().order_by(F('earliest_deadline').asc(nulls_last=True), '-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context() 
        context['show_archived'] = self.request.query_params.get('is_archived') == 'true'
        return context

    def perform_create(self, serializer):
        order = serializer.save()
        try:
            send_telegram_notification(order)
        except Exception as e:
            print(f"Ошибка Telegram: {e}")

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        try:
            order = self.get_object()
            c = order.items.update(is_archived=True)
            order.update_status() 
            return Response({'status': 'success', 'message': f'{c} товаров архивировано.'})
        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        try:
            order = self.get_object()
            c = order.items.update(is_archived=False)
            order.update_status()
            return Response({'status': 'success', 'message': f'{c} товаров восстановлено.'})
        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=400)

class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all()
    permission_classes = [IsAuthenticated, IsAdminOrCantDelete]

    def get_serializer_class(self):
        if self.request.method in ['POST', 'PUT', 'PATCH']:
            return ItemWriteSerializer
        return ItemSerializer

class ProductViewSet(viewsets.ModelViewSet): # Изменили на ModelViewSet!
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer
    
    # Теперь требуем авторизацию для изменения товаров
    permission_classes = [permissions.IsAuthenticated] 
    
    pagination_class = None 
    
    @method_decorator(never_cache)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.filter(is_active=True).order_by('first_name')
    serializer_class = UserSimpleSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

# ==========================================
# 3. ДОПОЛНИТЕЛЬНЫЕ ЭНДПОИНТЫ (СТАТИСТИКА, ИИ, ИНТЕГРАЦИИ)
# ==========================================

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def chat_with_ai(request):
    question = request.data.get('message', '')
    if not question:
        return Response({'error': 'Пустой вопрос'}, status=400)

    # Теперь вызываем нашу реальную нейросеть!
    answer = ask_gemini(question)

    return Response({'answer': answer})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statistics_data_view(request):
    period = request.query_params.get('period', 'week')
    if not request.user.is_superuser:
        period = 'week'
    
    today = timezone.now().date()
    start_date = today
    
    if period == 'month':
        start_date = today - timedelta(days=29) # 30 дней включая сегодня
    elif period == 'year':
        # Откатываемся на 11 месяцев назад
        start_month = today.month + 1
        start_year = today.year - 1
        if start_month > 12:
            start_month -= 12
            start_year += 1
        start_date = date(start_year, start_month, 1)
    else: 
        start_date = today - timedelta(days=6) # 7 дней для недели
        period = 'week' # страховка

    orders_in_period = Order.objects.filter(created_at__date__gte=start_date)
    total_orders = orders_in_period.count()
    pending_orders = orders_in_period.filter(status='in-progress').count()
    created_today = Order.objects.filter(created_at__date=today).count()
    
    top_product_query = Item.objects.filter(order__in=orders_in_period).values('name').annotate(name_count=Count('name')).order_by('-name_count').first()
    top_product_name = top_product_query['name'] if top_product_query else "Нет данных"

    status_counts_query = orders_in_period.values('status').annotate(count=Count('status')).order_by('status')
    status_data = {
        'labels': [item['status'] for item in status_counts_query],
        'counts': [item['count'] for item in status_counts_query],
    }

    # --- НОВАЯ ЛОГИКА ДЛЯ ГРАФИКА ДИНАМИКИ (Диаграмма с заливкой) ---
    dynamics_data = []
    
    if period in ['week', 'month']:
        # Группируем по дням
        daily_counts = orders_in_period.annotate(date=TruncDate('created_at')).values('date').annotate(count=Count('id'))
        counts_dict = {item['date']: item['count'] for item in daily_counts}
        
        days_count = 7 if period == 'week' else 30
        for i in range(days_count - 1, -1, -1):
            d = today - timedelta(days=i)
            if period == 'week':
                weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
                name = weekdays[d.weekday()]
            else:
                name = d.strftime('%d.%m') # Для месяца формат 08.03
                
            dynamics_data.append({
                'name': name,
                'orders': counts_dict.get(d, 0) # 0, если в этот день не было заказов
            })
            
    elif period == 'year':
        # Группируем по месяцам
        monthly_counts = orders_in_period.annotate(month=TruncMonth('created_at')).values('month').annotate(count=Count('id'))
        # Django может вернуть datetime, поэтому берем .date()
        month_dict = {item['month'].date() if hasattr(item['month'], 'date') else item['month']: item['count'] for item in monthly_counts}
        
        for i in range(11, -1, -1):
            m = today.month - i
            y = today.year
            if m <= 0:
                m += 12
                y -= 1
            target_month = date(y, m, 1)
            months_ru = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
            
            dynamics_data.append({
                'name': f"{months_ru[m-1]}", # Например "Мар"
                'orders': month_dict.get(target_month, 0)
            })

    return Response({
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'created_today': created_today,
        'top_product': top_product_name,
        'status_counts': status_data,
        'dynamics_data': dynamics_data, # Возвращаем готовый массив для графика
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def sync_to_google_sheets(request):
    return Response({'error': 'Библиотека gspread не установлена. Заглушка активна.'}, status=500)