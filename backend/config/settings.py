import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta # Добавили для настройки времени жизни токенов

# 1. Сначала находим BASE_DIR (путь к папке backend)
BASE_DIR = Path(__file__).resolve().parent.parent

# 2. Жестко указываем точный путь к файлу .env
env_path = BASE_DIR / '.env'
load_dotenv(dotenv_path=env_path)


# Quick-start development settings - unsuitable for production
# Секретный ключ теперь берется из файла .env
SECRET_KEY = os.environ.get('SECRET_KEY')

# Режим дебага тоже берем из .env
DEBUG = os.environ.get('DEBUG') == 'True'

ALLOWED_HOSTS = ['*'] # Для разработки можно поставить '*', на проде укажешь свой домен


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
    'rest_framework_simplejwt', # Добавили библиотеку для JWT токенов
    'corsheaders',
    
    # Наше локальное приложение EcoPrint:
    'app',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    
    # CORS Middleware ОБЯЗАТЕЛЬНО должен быть выше CommonMiddleware
    'corsheaders.middleware.CorsMiddleware',  
    
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Указывает на config вместо core
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

# Указывает на config вместо core
WSGI_APPLICATION = 'config.wsgi.application'


# Database
# Теперь используем PostgreSQL и берем данные из .env
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT'),
    }
}

if not os.environ.get('DB_NAME'):
    print("ВНИМАНИЕ: Файл .env не загрузился!")

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
LANGUAGE_CODE = 'ru-ru' # Сразу поставим русский язык для админки

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# --- НАСТРОЙКИ CORS ---
# Разрешаем запросы с локального сервера Vite (React)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


# --- НАСТРОЙКИ REST FRAMEWORK ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

# --- НАСТРОЙКИ JWT ТОКЕНОВ ---
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1), # Токен живет 1 день
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7), # Рефреш токен живет 7 дней
    'AUTH_HEADER_TYPES': ('Bearer',), # React будет отправлять "Bearer <token>"
}


GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')