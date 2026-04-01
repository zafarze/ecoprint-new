from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

# === Модель Заказа ===
class Order(models.Model):
    STATUS_CHOICES = [
        ('not-ready', 'Не готов'),
        ('in-progress', 'В процессе'),
        ('ready', 'Готово')
    ]

    client = models.CharField(max_length=255, verbose_name="Клиент")
    client_phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Телефон")
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='not-ready',
        verbose_name="Статус заказа"
    )
    is_received = models.BooleanField(default=False, verbose_name="Получен клиентом")
    
    # 🔥 НОВОЕ ПОЛЕ: Точная дата и время выдачи заказа
    received_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата выдачи")
    
    # Поле для архива
    is_archived = models.BooleanField(default=False, verbose_name="В архиве") 
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        ordering = ['-created_at']

    def __str__(self):
        return f"Заказ №{self.id} от {self.client}"

    def update_status(self):
        # ИСПРАВЛЕНО: Используем .all(), чтобы работал prefetch_related и не было N+1 запросов
        statuses = [item.status for item in self.items.all()]
        
        old_status = self.status
        new_status = 'not-ready'

        if not statuses:
            new_status = 'not-ready'
        elif all(s == 'ready' for s in statuses):
            new_status = 'ready'
        elif any(s == 'in-progress' for s in statuses) or \
             ('ready' in statuses and 'not-ready' in statuses):
            new_status = 'in-progress'
        else:
            new_status = 'not-ready'
            
        if old_status != new_status:
            self.status = new_status
            self.save(update_fields=['status', 'updated_at'])

# === Модель Товара в Заказе ===
class Item(models.Model):
    STATUS_CHOICES = [
        ('not-ready', 'Не готов'),
        ('in-progress', 'В процессе'),
        ('ready', 'Готово')
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="Заказ"
    )
    name = models.CharField(max_length=255, verbose_name="Название товара")
    quantity = models.PositiveIntegerField(default=1, verbose_name="Количество")
    
    deadline = models.DateField(
        verbose_name="Срок сдачи", 
        null=True, 
        blank=True
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='not-ready',
        verbose_name="Статус"
    )

    responsible_user = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL,
        null=True, 
        blank=True,
        related_name="items",
        verbose_name="Ответственный"
    )
    
    comment = models.TextField(
        blank=True,
        verbose_name="Комментарий"
    )
    
    ready_at = models.DateTimeField(
        null=True, 
        blank=True, 
        verbose_name="Дата готовности"
    )
    is_archived = models.BooleanField(
        default=False, 
        verbose_name="В архиве"
    )

    class Meta:
        verbose_name = "Товар заказа"
        verbose_name_plural = "Товары заказа"

    def __str__(self):
        return f"{self.name} ({self.quantity} шт.)"
        
    # ИСПРАВЛЕНО: Метод save() удален. Создание новых Product теперь должно быть в services.py

# === Модель Профиля ===
class Profile(models.Model):
    ROLE_CHOICES = [
        ('superadmin', 'Супер Админ'),
        ('manager', 'Менеджер'),
        ('worker', 'Работник'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name="Пользователь")
    
    # 🔥 НОВОЕ ПОЛЕ РОЛЬ: Разграничение прав
    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        default='worker', 
        verbose_name="Роль в системе"
    )

    avatar = models.ImageField(
        upload_to='avatars/',
        default='avatars/default.jpg',
        verbose_name="Аватар"
    )
    sound_notifications = models.BooleanField(default=True, verbose_name="Звук")
    popup_notifications = models.BooleanField(default=True, verbose_name="Всплывающие окна")
    day_before_notifications = models.BooleanField(default=True, verbose_name="Напоминание за день")

    class Meta:
        verbose_name = "Профиль пользователя"
        verbose_name_plural = "Профили пользователей"

    def __str__(self):
        return f'Профиль: {self.user.username}'

@receiver(post_save, sender=User)
def ensure_profile_exists(sender, instance, **kwargs):
    Profile.objects.get_or_create(user=instance)

# === Модель Настроек Компании ===
class CompanySettings(models.Model):
    company_name = models.CharField(max_length=255, blank=True, verbose_name="Название компании")
    address = models.CharField(max_length=500, blank=True, verbose_name="Адрес")
    phone = models.CharField(max_length=50, blank=True, verbose_name="Телефон")
    company_logo = models.ImageField(upload_to='company_logo/', blank=True, null=True, verbose_name="Логотип")

    def __str__(self):
        return "Настройки компании"

    def save(self, *args, **kwargs):
        self.pk = 1 
        # ИСПРАВЛЕНО: Используем современный синтаксис super()
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
        
    class Meta:
        verbose_name = "Настройки компании"
        verbose_name_plural = "Настройки компании"

# === Модель Настроек Telegram ===
class TelegramSettings(models.Model):
    bot_token = models.CharField(max_length=255, blank=True, verbose_name="Token Telegram-бота")
    chat_id = models.CharField(max_length=255, blank=True, verbose_name="Chat ID")

    def __str__(self):
        return "Настройки Telegram"

    def save(self, *args, **kwargs):
        self.pk = 1 
        # ИСПРАВЛЕНО: Используем современный синтаксис super()
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
        
    class Meta:
        verbose_name = "Настройки Telegram"
        verbose_name_plural = "Настройки Telegram"

# === Модель Ассортимента ===
class Product(models.Model):
    CATEGORY_CHOICES = [
        ('polygraphy', 'Полиграфия'),
        ('packaging', 'Упаковка'),
        ('souvenirs', 'Сувениры'),
        ('large-format', 'Широкоформатная печать'),
    ]

    name = models.CharField(max_length=100, verbose_name="Название")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, verbose_name="Категория")
    icon = models.CharField(max_length=50, blank=True, verbose_name="Иконка (FontAwesome)")

    class Meta:
        verbose_name = "Товар (шаблон)"
        verbose_name_plural = "Товары (шаблоны)"
        ordering = ['category', 'name']

    def __str__(self):
        return self.name

# === Модель Истории Изменений ===
class OrderHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='history', verbose_name="Заказ")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Пользователь")
    message = models.TextField(verbose_name="Действие")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата")

    class Meta:
        ordering = ['-created_at'] 
        verbose_name = "Запись истории"
        verbose_name_plural = "История изменений"

    def __str__(self):
        user_str = self.user.username if self.user else "Система"
        return f"{self.created_at.strftime('%d.%m %H:%M')} - {user_str}: {self.message}"