# app/management/commands/auto_archive.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from app.models import Order

class Command(BaseCommand):
    help = 'Автоматически переводит в архив заказы, выданные более 3 дней назад, и удаляет из архива через 30 дней'

    def handle(self, *args, **kwargs):
        # Вычисляем даты
        three_days_ago = timezone.now() - timedelta(days=3)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
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
        else:
            # Архивируем всё безопасно через транзакцию
            with transaction.atomic():
                for order in orders_to_archive:
                    order.is_archived = True
                    order.save(update_fields=['is_archived'])
                    
                    # Заодно архивируем все товары внутри этого заказа
                    order.items.filter(is_archived=False).update(is_archived=True)
                    
            self.stdout.write(self.style.SUCCESS(f'[{timezone.now().strftime("%d.%m.%Y %H:%M")}] УСПЕШНО АРХИВИРОВАНО ЗАКАЗОВ: {count}'))
        
        # --- БЛОК АВТОМАТИЧЕСКОГО УДАЛЕНИЯ ИЗ АРХИВА ---
        
        # Ищем: В архиве (True), последний раз обновлялись более 30 дней назад
        orders_to_delete = Order.objects.filter(
            is_archived=True,
            updated_at__lte=thirty_days_ago
        )
        
        delete_count = orders_to_delete.count()
        
        if delete_count == 0:
            self.stdout.write(self.style.SUCCESS(f'[{timezone.now().strftime("%d.%m.%Y %H:%M")}] Нет заказов для авто-удаления из архива.'))
        else:
            with transaction.atomic():
                orders_to_delete.delete()
            self.stdout.write(self.style.SUCCESS(f'[{timezone.now().strftime("%d.%m.%Y %H:%M")}] УСПЕШНО УДАЛЕНО ЗАКАЗОВ ИЗ АРХИВА: {delete_count}'))
