import multiprocessing

# Configuration du serveur
bind = "0.0.0.0:5000"
workers = multiprocessing.cpu_count() * 2 + 1
threads = 2
worker_class = "gevent"
timeout = 120

# Configuration des logs
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Configuration de l'application
reload = True
preload_app = True

# Configuration de la sécurité
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190 