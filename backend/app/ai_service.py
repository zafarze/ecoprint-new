import os
from django.conf import settings
from google import genai
from .models import Order

def get_context_from_db():
    total = Order.objects.count()
    pending = Order.objects.filter(status='in-progress').count()
    ready = Order.objects.filter(status='ready').count()
    
    active_orders = Order.objects.filter(status__in=['not-ready', 'in-progress']).prefetch_related('items')
    
    orders_text = ""
    for order in active_orders:
        items_list = []
        for i in order.items.all():
            deadline_str = i.deadline.strftime('%d.%m') if i.deadline else "без даты"
            items_list.append(f"{i.name} ({i.quantity} шт, до {deadline_str})")
            
        items_str = "; ".join(items_list)
        orders_text += f"- Заказ №{order.id} Клиент: {order.client}. Состав: {items_str}. Статус заказа: {order.get_status_display()}\n"

    if not orders_text:
        orders_text = "Нет активных заказов."

    context = (
        f"СВОДКА ПО CRM:\n"
        f"Всего заказов в истории: {total}\n"
        f"Сейчас в работе (In Progress): {pending}\n"
        f"Готовы (Ready): {ready}\n\n"
        f"СПИСОК ТЕКУЩИХ АКТИВНЫХ ЗАКАЗОВ:\n{orders_text}"
    )
    return context

def ask_gemini(user_question):
    api_key = getattr(settings, 'GEMINI_API_KEY', None)
    if not api_key:
        return "Ошибка сервера: Не настроен API ключ Gemini. Проверьте настройки."

    try:
        # В новой версии клиент создается так:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"❌ ОШИБКА настройки Gemini: {e}")
        return f"Ошибка настройки клиента AI: {e}"

    context_data = get_context_from_db()
    
    system_instruction = (
        "Ты — полезный AI-помощник в CRM типографии. "
        "Твоя цель — быстро давать информацию менеджерам. "
        "Не придумывай факты. Если заказа нет в списке, так и скажи. "
        "Отвечай коротко и используй эмодзи."
    )
    
    full_prompt = (
        f"{system_instruction}\n\n"
        f"ДАННЫЕ ИЗ БАЗЫ:\n{context_data}\n\n"
        f"ВОПРОС ПОЛЬЗОВАТЕЛЯ: {user_question}"
    )
    
    try:
        # В новой версии запрос отправляется так:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=full_prompt,
        )
        return response.text
    except Exception as e:
        print(f"Gemini Error: {e}")
        return f"Извините, ошибка соединения с AI: {str(e)}"