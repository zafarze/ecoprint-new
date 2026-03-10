import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta
import dj_database_url # <--- ДОБАВЛЕНО ДЛЯ CLOUD RUN И ОБЛАЧНОЙ БД

# 1. Сначала находим BASE_DIR (путь к папке backend)
BASE_DIR = Path(__file__).resolve().parent.parent

# 2. Жестко указываем точный путь к файлу .env
env_path = BASE_DIR / '.env'
load_dotenv(dotenv_path=env_path)


# Quick-start development settings - unsuitable for production
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-fallback-key')
DEBUG = os.environ.get('DEBUG') == 'True'

# Разрешаем запросы с любых IP (нужно для облака)
ALLOWED_HOSTS = ['*'] 


# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Наши новые библиотеки для работы с React:
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    
    # Наше локальное приложение EcoPrint:
    'app',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # <--- ОБЯЗАТЕЛЬНО: WhiteNoise для раздачи CSS админки в облаке
    'django.contrib.sessions.middleware.SessionMiddleware',
    
    # CORS Middleware ОБЯЗАТЕЛЬНО должен быть выше CommonMiddleware
    'corsheaders.middleware.CorsMiddleware',  
    
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# ==========================================
# НАСТРОЙКА БАЗЫ ДАННЫХ (УМНОЕ ПЕРЕКЛЮЧЕНИЕ ДЛЯ GOOGLE CLOUD)
# ==========================================
# Если переменная RUN_ON_CLOUD_RUN равна True, значит сервер запущен в Google
if os.environ.get('RUN_ON_CLOUD_RUN') == 'True':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME'),
            'USER': os.environ.get('DB_USER'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            # Google Cloud SQL подключается через специальный сокет-путь
            'HOST': f"/cloudsql/{os.environ.get('CLOUD_SQL_CONNECTION_NAME')}",
        }
    }
else:
    # Локальная база данных на твоем ПК (для разработки) + ЗАГЛУШКИ ДЛЯ DOCKER BUILD
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'dummy_db'),
            'USER': os.environ.get('DB_USER', 'dummy_user'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'dummy_pass'),
            'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = 'Asia/Dushanbe' # Установил правильный часовой пояс для Таджикистана
USE_I18N = True
USE_TZ = True

# ==========================================
# СТАТИКА (STATIC FILES) ДЛЯ ОБЛАКА
# ==========================================
STATIC_URL = 'static/'
# Папка, куда соберется вся статика при команде collectstatic
STATIC_ROOT = BASE_DIR / 'staticfiles'
# Алгоритм кэширования и сжатия статики от WhiteNoise
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ==========================================
# НАСТРОЙКИ CORS
# ==========================================
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # Добавили твой домен на Firebase!
    "https://ecoprint-app.web.app",
    "https://ecoprint-app.firebaseapp.com"
]

CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type',
    'dnt', 'origin', 'user-agent', 'x-csrftoken', 'x-requested-with',
]

# ==========================================
# НАСТРОЙКИ REST FRAMEWORK & JWT
# ==========================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1), 
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')