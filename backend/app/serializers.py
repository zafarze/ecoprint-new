from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.models import User

# Импортируем наши новые модели
from .models import Order, Item, Product, OrderHistory

# Импортируем твой сервис для обработки бизнес-логики
from .services import OrderService

# 1. Сериализатор Пользователя (для отображения ответственных)
class UserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']

# 2. Сериализатор Товаров (шаблонов)
class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'category', 'icon']

# 3. Сериализатор Истории
class OrderHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    created_at_formatted = serializers.SerializerMethodField()

    class Meta:
        model = OrderHistory
        fields = ['user_name', 'message', 'created_at_formatted']

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return "Система"

    def get_created_at_formatted(self, obj):
        return obj.created_at.strftime("%d.%m.%Y %H:%M")

# 4. Сериализатор для чтения Товара внутри заказа
class ItemSerializer(serializers.ModelSerializer):
    responsible_user = UserSimpleSerializer(read_only=True)
    responsible_user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='responsible_user', write_only=True, allow_null=True, required=False
    )

    class Meta:
        model = Item
        fields = ['id', 'name', 'quantity', 'status', 'deadline', 'comment',
                  'responsible_user', 'responsible_user_id', 'is_archived', 'ready_at']

# 5. Сериализатор для записи (создания/обновления) Товара
class ItemWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    responsible_user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='responsible_user', allow_null=True, required=False
    )
    
    class Meta:
        model = Item
        fields = ['id', 'name', 'quantity', 'status', 'deadline', 'comment', 'responsible_user_id']

# 6. Главный сериализатор Заказа
class OrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    items_write = ItemWriteSerializer(many=True, write_only=True, required=False)
    history = OrderHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'client', 'client_phone', 'status', 'is_received', 'created_at', 'items', 'items_write', 'history']
        read_only_fields = ['status'] # Защищаем статус от прямого редактирования

    def get_items(self, obj):
        # По умолчанию показываем не архивные
        show_archived = self.context.get('show_archived', False)
        if show_archived:
            items_to_show = obj.items.filter(is_archived=True)
        else:
            items_to_show = obj.items.filter(is_archived=False)
        return ItemSerializer(items_to_show, many=True).data

    def create(self, validated_data):
        items_data = validated_data.pop('items_write', []) 
        
        # Безопасно получаем пользователя, даже если запрос пришел без авторизации
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None

        with transaction.atomic():
            order = Order.objects.create(**validated_data)
            OrderHistory.objects.create(order=order, user=user, message="Создал заказ")

            for item_data in items_data:
                if 'id' in item_data: del item_data['id']
                Item.objects.create(order=order, **item_data)
                
        return order
        
    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        
        # Вызываем твою крутую логику из services.py
        updated_order = OrderService.update_order(
            order=instance,
            validated_data=validated_data,
            user=user
        )
        return updated_order