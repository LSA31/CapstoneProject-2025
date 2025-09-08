import logging
from common.context_vars import user_context

log_format = "%(asctime)s %(name)s %(levelname)s:\tuser: %(user)s: %(message)s"


class CustomFormatter(logging.Formatter):
    def format(self, record):
        if not hasattr(record, "user"):
            record.user = "Anonymous"
        return super().format(record)


handler = logging.StreamHandler()
handler.setFormatter(CustomFormatter(log_format))

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logger.addHandler(handler)


class ContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord):
        record.user = str(user_context.get())
        return True


logger.addFilter(ContextFilter())
