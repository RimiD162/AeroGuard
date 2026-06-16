import logging
import sys

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='{"time": "%(asctime)s", "level": "%(levelname)s", "name": "%(name)s", "message": "%(message)s"}',
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True
    )

setup_logging()
logger = logging.getLogger("aeroguard")
