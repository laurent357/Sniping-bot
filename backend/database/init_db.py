import sqlite3

# Connexion à la base de données (créée si elle n'existe pas)
conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

# Création de la table des transactions
cursor.execute('''
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_address TEXT NOT NULL,
    amount REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
''')

# Sauvegarde des changements et fermeture de la connexion
conn.commit()
conn.close()