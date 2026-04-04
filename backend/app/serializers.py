# app/serializers.py
from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CompanySettings, TelegramSettings, Order, Item, Product, OrderHistory
from .services import OrderService

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        role = 'worker'
        if hasattr(self.user, 'profile'):
            role = self.user.profile.role

        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'email': self.user.email,
            'is_superuser': self.user.is_superuser,
            'role': role,
        }
        return data

class UserSimpleSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role']

    def get_role(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.role
        return 'worker'

class UserWriteSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'password']

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        role = profile_data.get('role', 'worker')
        password = validated_data.pop('password', None)
        
        # Создаем юзера и ставим пароль (кастомный или стартовый)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_password('123456')
        user.save()
        
        # Профиль либо создался через сигнал, либо нет, поэтому обновляем роль
        from .models import Profile
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.role = role
        profile.save()
        
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        role = profile_data.get('role')
        password = validated_data.pop('password', None)
        
        # Обновляем обычные поля User
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
            
        instance.save()
        
        # Обновляем роль, если передали
        if role:
            from .models import Profile
            profile, _ = Profile.objects.get_or_create(user=instance)
            profile.role = role
            profile.save()
            
        return instance

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'category', 'icon']

class OrderHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    created_at_formatted = serializers.DateTimeField(source='created_at', format="%d.%m.%Y %H:%M", read_only=True)

    class Meta:
        model = OrderHistory
        fields = ['id', 'user_name', 'message', 'created_at_formatted', 'created_at']

    def get_user_name(self, obj):
        if obj.user:
            name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return name if name else obj.user.username
        return "Система"

class ItemSerializer(serializers.ModelSerializer):
    responsible_user = UserSimpleSerializer(read_only=True)
    responsible_user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='responsible_user', write_only=True, allow_null=True, required=False
    )

    class Meta:
        model = Item
        fields = [
            'id', 'name', 'quantity', 'status', 'deadline', 'comment',
            'responsible_user', 'responsible_user_id', 'is_archived'
        ]

class ItemWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    responsible_user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='responsible_user', allow_null=True, required=False
    )
    
    class Meta:
        model = Item
        fields = ['id', 'name', 'quantity', 'status', 'deadline', 'comment', 'responsible_user_id']


# 🔥 БАЗОВЫЙ СЕРИАЛИЗАТОР: Хранит общую логику для списков и деталей (DRY)
class BaseOrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    def get_items(self, obj):
        show_archived = self.context.get('show_archived', False)
        # Благодаря prefetch_related во views.py, вызов obj.items.all() работает мгновенно из кэша
        if show_archived:
            items_to_show = [item for item in obj.items.all() if item.is_archived]
        else:
            items_to_show = [item for item in obj.items.all() if not item.is_archived]
        return ItemSerializer(items_to_show, many=True).data


# 🔥 СЕРИАЛИЗАТОР СПИСКА: Наследует get_items из BaseOrderSerializer
class OrderListSerializer(BaseOrderSerializer):
    # УБРАНА history для существенного ускорения загрузки списка!
    
    class Meta:
        model = Order
        fields = [
            'id', 'client', 'client_phone', 'status', 'is_received', 'received_at', 'is_archived', 
            'created_at', 'updated_at', 'items'
        ]
        read_only_fields = ['status']


# 🔥 ДЕТАЛЬНЫЙ СЕРИАЛИЗАТОР: Наследует get_items и добавляет историю/сохранение
class OrderSerializer(BaseOrderSerializer):
    items_write = ItemWriteSerializer(many=True, write_only=True, required=False)
    history = OrderHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'client', 'client_phone', 'status', 'is_received', 'received_at', 'is_archived', 
            'created_at', 'updated_at', 'items', 'items_write', 'history'
        ]
        read_only_fields = ['status']

    def create(self, validated_data):
        items_data = validated_data.pop('items_write', []) 
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
        
        updated_order = OrderService.update_order(
            order=instance,
            validated_data=validated_data,
            user=user
        )
        return updated_order
    

class CompanySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySettings
        fields = ['company_name', 'address', 'phone']

class TelegramSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelegramSettings
        fields = ['bot_token', 'chat_id']