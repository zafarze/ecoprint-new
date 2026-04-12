# Используем четкую версию Python для обхода ошибки кэша в Google Cloud
FROM python:3.12.2-slim-bookworm

# Настройки среды
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Создаем рабочую директорию
WORKDIR /app

# Копируем зависимости и устанавливаем их
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь проект
COPY . .

# Собираем статические файлы (для админки)
RUN python manage.py collectstatic --noinput

# Команда для запуска сервера (Gunicorn - это мощный сервер для продакшена)
# Добавлен вызов migrate перед запуском для применения миграций в Cloud Run
CMD sh -c "python manage.py migrate && exec gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2"
