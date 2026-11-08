from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from app.core.config import settings


def utc_naive_bounds(
    start_date: date | None, end_date: date | None
) -> tuple[datetime | None, datetime | None]:
    """Convert inclusive local calendar dates to naive UTC datetimes."""
    local_timezone = ZoneInfo(settings.APP_TIMEZONE)

    start_at = None
    if start_date:
        start_at = (
            datetime.combine(start_date, time.min, tzinfo=local_timezone)
            .astimezone(timezone.utc)
            .replace(tzinfo=None)
        )

    end_before = None
    if end_date:
        end_before = (
            datetime.combine(
                end_date + timedelta(days=1), time.min, tzinfo=local_timezone
            )
            .astimezone(timezone.utc)
            .replace(tzinfo=None)
        )

    return start_at, end_before
