# app/management/commands/auto_archive.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from app.models import Order

class Command(BaseCommand):
    help = 'Автоматически переводит в архив заказы, выданные более 3 дней назад'

    def handle(self, *args, **kwargs):
        # Вычисляем дату: текущее время минус 3 дня
        three_days_ago = timezone.now() - timedelta(days=3)
        
        from django.db.models import Q
        
        # Ищем: Выданные (True), Не в архиве (False), дата выдачи меньше или равна 3 дням назад 
        # (у старых заказов received_at может быть NULL, тогда смотрим по updated_at)
        orders_to_archive = Order.objects.filter(
            Q(received_at__lte=three_days_ago) | 
            Q(received_at__isnull=True, updated_at__lte=three_days_ago),
            is_received=True,
            is_archived=False
        )
        
        count = orders_to_archive.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS(f'[{timezone.now().strftime("%d.%m.%Y %H:%M")}] Нет заказов, ожидающих авто-архивацию.'))
            return
            
        # Архивируем всё безопасно через транзакцию
        with transaction.atomic():
            for order in orders_to_archive:
                order.is_archived = True
                order.save(update_fields=['is_archived'])
                
                # Заодно архивируем все товары внутри этого заказа
                order.items.filter(is_archived=False).update(is_archived=True)
                
        self.stdout.write(self.style.SUCCESS(f'[{timezone.now().strftime("%d.%m.%Y %H:%M")}] УСПЕШНО АРХИВИРОВАНО ЗАКАЗОВ: {count}'))