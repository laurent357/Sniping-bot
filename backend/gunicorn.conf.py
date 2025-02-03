import multiprocessing
import os

# Configuration des workers
workers = multiprocessing.cpu_count() * 2 + 1
threads = 2
worker_class = 'gevent'
worker_connections = 1000

# Timeouts
timeout = 30
keepalive = 2

# Binding
bind = '0.0.0.0:5000'

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# SSL (si nécessaire)
# keyfile = '/etc/certs/privkey.pem'
# certfile = '/etc/certs/fullchain.pem'

# Protection contre les surcharges
max_requests = 1000
max_requests_jitter = 50

# Configuration des headers
forwarded_allow_ips = '*'

# Configuration du processus
daemon = False
pidfile = None
umask = 0
user = None
group = None

# Configuration de l'application
preload_app = True
reload = False
reload_engine = 'auto'

# Configuration des hooks
def on_starting(server):
    """Log le démarrage du serveur."""
    server.log.info("Starting Gunicorn server...")

def on_reload(server):
    """Log le rechargement du serveur."""
    server.log.info("Reloading Gunicorn server...")

def post_fork(server, worker):
    """Configuration post-fork des workers."""
    server.log.info(f"Worker spawned (pid: {worker.pid})")

def worker_int(worker):
    """Log l'arrêt gracieux d'un worker."""
    worker.log.info(f"Worker {worker.pid} received INT signal")

def worker_abort(worker):
    """Log l'arrêt forcé d'un worker."""
    worker.log.info(f"Worker {worker.pid} received SIGABRT signal")

# Configuration spécifique à l'environnement
if os.environ.get('FLASK_ENV') == 'development':
    reload = True
    workers = 2
    loglevel = 'debug' 