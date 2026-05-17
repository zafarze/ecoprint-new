import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth.models import User
from typing import List, Dict, Any

from .models import Order, Item, OrderHistory, Product

logger = logging.getLogger(__name__)


def run_auto_archive(dry_run: bool = False) -> dict:
    now = timezone.now()
    three_days_ago = now - timedelta(days=3)
    thirty_days_ago = now - timedelta(days=30)

    archive_filter = (
        Q(received_at__lte=three_days_ago)
        | Q(received_at__isnull=True, updated_at__lte=three_days_ago)
    )

    archive_ids = []
    delete_ids = []

    if dry_run:
        archive_ids = list(
            Order.objects.filter(archive_filter, is_archived=False, is_received=True)
            .values_list('id', flat=True)
        )
        delete_ids = list(
            Order.objects.filter(is_archived=True, updated_at__lte=thirty_days_ago)
            .values_list('id', flat=True)
        )
    else:
        with transaction.atomic():
            archive_ids = list(
                Order.objects.filter(archive_filter, is_archived=False, is_received=True)
                .values_list('id', flat=True)
            )
            if archive_ids:
                Order.objects.filter(id__in=archive_ids).update(
                    is_archived=True, updated_at=now
                )
                Item.objects.filter(order_id__in=archive_ids, is_archived=False).update(
                    is_archived=True
                )
            # Re-query INSIDE the transaction, AFTER archiving: freshly-archived
            # orders now have updated_at=now and will NOT match the 30-day filter.
            delete_ids = list(
                Order.objects.filter(is_archived=True, updated_at__lte=thirty_days_ago)
                .values_list('id', flat=True)
            )
            if delete_ids:
                logger.warning('auto_archive: hard-deleting orders %s', delete_ids)
                Order.objects.filter(id__in=delete_ids).delete()

        # Reached only if the transaction committed successfully.
        if delete_ids:
            logger.warning('auto_archive: committed permanent deletion of orders %s', delete_ids)
        logger.info('auto_archive done: archived=%d deleted=%d', len(archive_ids), len(delete_ids))

    return {
        'archived_count': len(archive_ids),
        'archived_ids': archive_ids,
        'deleted_count': len(delete_ids),
        'deleted_ids': delete_ids,
        'dry_run': dry_run,
        'ran_at': now.isoformat(),
    }


class OrderService:
    @staticmethod
    def _log_history(order: Order, user: User, message: str) -> None:
        OrderHistory.objects.create(order=order, user=user, message=message)

    @classmethod
    def _ensure_product_exists(cls, name: str) -> None:
        if not name:
            return
        clean_name = name.strip()
        
        # 🔥 ОПТИМИЗАЦИЯ: get_or_create работает быстрее и безопаснее, 
        # не допуская дубликатов при одновременных запросах (Race Condition)
        if clean_name:
            # Сначала быстро проверяем через iexact (без учета регистра)
            if not Product.objects.filter(name__iexact=clean_name).exists():
                # Если не нашли, создаем безопасно (на случай если кто-то успел создать за миллисекунду до нас)
                Product.objects.get_or_create(
                    name=clean_name,
                    defaults={
                        'category': 'polygraphy',  
                        'icon': 'fas fa-box-open'  
                    }
                )

    @classmethod
    def update_order(cls, order: Order, validated_data: Dict[str, Any], user: User) -> Order:
        items_data = validated_data.pop('items_write', None)

        with transaction.atomic():
            cls._update_order_fields(order, validated_data, user)
            if items_data is not None:
                cls._sync_items(order, items_data, user)
            order.update_status()

        return order

    @classmethod
    def _update_order_fields(cls, order: Order, data: Dict[str, Any], user: User) -> None:
        from django.utils import timezone # 🔥 Убедись, что это импортировано в начале файла

        if 'client' in data:
            new_client = data['client']
            if order.client != new_client:
                cls._log_history(order, user, f"Изменил клиента: {order.client} -> {new_client}")
                order.client = new_client

        if 'client_phone' in data:
            order.client_phone = data['client_phone']

        if 'is_received' in data:
            if order.is_received != data['is_received']:
                order.is_received = data['is_received']
                
                # 🔥 МАГИЯ ЗДЕСЬ: Если заказ выдан — ставим дату. Если сняли галочку — стираем дату.
                if order.is_received:
                    order.received_at = timezone.now()
                else:
                    order.received_at = None

                status_text = "Получен клиентом" if order.is_received else "Статус получения снят"
                cls._log_history(order, user, status_text)

        if 'status' in data:
            order.status = data['status']
            
        order.save()

    @classmethod
    def _sync_items(cls, order: Order, items_data: List[Dict[str, Any]], user: User) -> None:
        # 🔥 ОПТИМИЗАЦИЯ N+1: Достаем все товары из базы ОДНИМ запросом и кладем в словарь.
        # Теперь серверу не нужно бегать в базу данных на каждой итерации цикла.
        existing_items = {item.id: item for item in order.items.filter(is_archived=False)}
        keep_ids = []
        
        for item_data in items_data:
            item_id = item_data.get('id')
            
            # Ищем товар в нашем словаре в памяти (работает мгновенно)
            if item_id and item_id in existing_items:
                item_obj = existing_items[item_id]
                cls._update_single_item(order, item_obj, item_data, user)
                keep_ids.append(item_obj.id)
            else:
                if 'id' in item_data: del item_data['id']
                new_item = Item.objects.create(order=order, **item_data)
                keep_ids.append(new_item.id)
                cls._log_history(order, user, f"Добавил товар: {new_item.name}")
                
                cls._ensure_product_exists(new_item.name)

        # Массовое удаление (здесь всё было сделано идеально: один bulk-запрос на удаление)
        items_to_delete = order.items.filter(is_archived=False).exclude(id__in=keep_ids)
        for del_item in items_to_delete:
            cls._log_history(order, user, f"Удалил товар: {del_item.name}")
        items_to_delete.delete()

    @classmethod
    def _update_single_item(cls, order: Order, item: Item, new_data: Dict[str, Any], user: User) -> None:
        changes = []
        
        if 'name' in new_data and item.name != new_data['name']:
            changes.append(f"название '{item.name}' -> '{new_data['name']}'")
            cls._ensure_product_exists(new_data['name'])
            
        if 'status' in new_data and item.status != new_data['status']:
            changes.append(f"статус '{item.name}' ({item.status} -> {new_data['status']})")
        if 'quantity' in new_data and item.quantity != new_data['quantity']:
            changes.append(f"кол-во '{item.name}' ({item.quantity} -> {new_data['quantity']})")
        if 'deadline' in new_data and str(item.deadline) != str(new_data['deadline']):
            changes.append(f"срок '{item.name}'")

        if changes:
            msg = "Изменил: " + ", ".join(changes)
            cls._log_history(order, user, msg)

        for attr, value in new_data.items():
            if attr != 'id':
                setattr(item, attr, value)
        item.save()