import threading
import requests
import html # 🔥 ДОБАВЛЕНО: Для защиты от спецсимволов
from .models import TelegramSettings

def _send_telegram_task(order_id, client_name, items_details):
    try:
        # 🔥 ИСПРАВЛЕНИЕ 1: Правильный способ достать настройки из базы
        settings = TelegramSettings.objects.first()
        
        if not settings or not settings.bot_token or not settings.chat_id:
            print("Отправка в Telegram отменена: не настроен токен бота или chat_id.")
            return

        bot_token = settings.bot_token
        chat_id = settings.chat_id

        message_text = (
            f"<b>🔔 Новый заказ №{order_id}</b>\n"
            f"👤 <b>Клиент:</b> {client_name}\n"
            f"➖➖➖➖➖➖➖➖➖➖\n\n"
            f"{items_details}"
            f"➖➖➖➖➖➖➖➖➖➖\n"
            f"<i>🤖 Сообщение от EcoPrint CRM</i>"
        )
        
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {'chat_id': chat_id, 'text': message_text, 'parse_mode': 'HTML'}
        response = requests.post(url, data=payload, timeout=10)
        
        # 🔥 ИСПРАВЛЕНИЕ 2: Если Telegram отклонил сообщение, печатаем причину в консоль
        if response.status_code != 200:
            print(f"❌ Ошибка Telegram API: {response.text}")
            
    except Exception as e:
        print(f"❌ Ошибка отправки в Telegram: {e}")

def send_telegram_notification(order):
    try:
        items_details = ""
        created_str = order.created_at.strftime('%d.%m')
        
        # 🔥 ИСПРАВЛЕНИЕ 3: Экранируем имя клиента (защита от спецсимволов <, >, &)
        safe_client_name = html.escape(order.client)
        
        for i, item in enumerate(order.items.all(), 1):
            deadline_str = item.deadline.strftime('%d.%m') if item.deadline else "?"
            resp_name = "Не назначен"
            if item.responsible_user:
                u = item.responsible_user
                resp_name = f"{u.first_name} {u.last_name}".strip() or u.username

            # Экранируем текст, который вводит пользователь руками
            safe_item_name = html.escape(item.name)
            safe_comment = html.escape(item.comment) if item.comment else ""
            
            comment_text = f"\n   💬 <i>{safe_comment}</i>" if safe_comment else ""

            items_details += (
                f"<b>{i}. {safe_item_name}</b>\n"
                f"   📦 Кол-во: {item.quantity} шт.\n"
                f"   🗓 Даты: <b>{created_str} - {deadline_str}</b>\n" 
                f"   👷 Исполнитель: {resp_name}"
                f"{comment_text}\n\n"
            )

        thread = threading.Thread(
            target=_send_telegram_task,
            args=(order.id, safe_client_name, items_details)
        )
        thread.start()
    except Exception as e:
        print(f"❌ Ошибка при формировании уведомления: {e}")