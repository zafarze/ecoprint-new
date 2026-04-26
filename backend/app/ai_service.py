import os
from django.conf import settings
from .models import Order


def get_context_from_db():
    total = Order.objects.count()
    pending = Order.objects.filter(status='in-progress').count()
    ready = Order.objects.filter(status='ready').count()

    # Ограничиваем выгрузку до 50 последних активных заказов (защита от OOM и для скорости)
    active_orders = Order.objects.filter(
        status__in=['not-ready', 'in-progress']
    ).prefetch_related('items').order_by('-created_at')[:50]

    orders_list = []
    for order in active_orders:
        items_list = []
        for i in order.items.all():
            deadline_str = i.deadline.strftime('%d.%m') if i.deadline else "без даты"
            items_list.append(f"{i.name} ({i.quantity} шт, до {deadline_str})")
        items_str = "; ".join(items_list)
        orders_list.append(
            f"- Заказ №{order.id} Клиент: {order.client}. Состав: {items_str}. "
            f"Статус заказа: {order.get_status_display()}"
        )

    orders_text = "\n".join(orders_list) if orders_list else "Нет активных заказов."

    return (
        f"СВОДКА ПО CRM:\n"
        f"Всего заказов в истории: {total}\n"
        f"Сейчас в работе (In Progress): {pending}\n"
        f"Готовы (Ready): {ready}\n\n"
        f"СПИСОК ТЕКУЩИХ АКТИВНЫХ ЗАКАЗОВ (показаны 50 самых новых):\n{orders_text}"
    )


def ask_gemini(user_question: str) -> str:
    api_key = os.environ.get('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
    if not api_key:
        return "Ошибка сервера: не настроен API-ключ Gemini. Добавь GEMINI_API_KEY в .env."

    # Импортируем библиотеку лениво — если её нет, не валим всё приложение
    try:
        from google import genai
    except ImportError as e:
        return f"Не установлена библиотека google-genai. Запусти: pip install google-genai. ({e})"

    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Ошибка настройки Gemini: {e}")
        return f"Ошибка настройки клиента AI: {e}"

    context_data = get_context_from_db()

    system_instruction = (
        "Ты — полезный AI-помощник в CRM типографии. "
        "Твоя цель — быстро давать информацию менеджерам. "
        "Помни, что ты видишь только 50 последних активных заказов. "
        "Не придумывай факты. Если заказа нет в списке, так и скажи (возможно, он в архиве или старый). "
        "Отвечай коротко и используй эмодзи."
    )

    full_prompt = (
        f"{system_instruction}\n\n"
        f"ДАННЫЕ ИЗ БАЗЫ:\n{context_data}\n\n"
        f"Вопрос пользователя: {user_question}"
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=full_prompt,
        )
        return response.text or "ИИ вернул пустой ответ."
    except Exception as e:
        print(f"Ошибка при генерации ответа: {e}")
        return f"Произошла ошибка при обращении к ИИ: {e}"
