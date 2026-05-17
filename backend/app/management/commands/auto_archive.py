# app/management/commands/auto_archive.py
from django.core.management.base import BaseCommand

from app.services import run_auto_archive


class Command(BaseCommand):
    help = 'Автоматически переводит в архив заказы, выданные более 3 дней назад, и удаляет из архива через 30 дней'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', dest='dry_run')

    def handle(self, *args, **options):
        result = run_auto_archive(dry_run=options['dry_run'])
        self.stdout.write(self.style.SUCCESS(
            f"auto_archive: archived={result['archived_count']} deleted={result['deleted_count']} "
            f"dry_run={result['dry_run']} ran_at={result['ran_at']}"
        ))
