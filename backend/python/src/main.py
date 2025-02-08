from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET', 'POST'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'services': {
            'flask': 'up',
            'rust': 'connecting'
        }
    })

@app.route('/api/dashboard', methods=['GET'])
@app.route('/dashboard', methods=['GET'])
def get_dashboard_data():
    # TODO: Implémenter la récupération des données réelles
    return jsonify({
        'balance': 0.0,
        'transactions': [],
        'active_orders': [],
        'performance': {
            'daily': 0.0,
            'weekly': 0.0,
            'monthly': 0.0
        }
    })

@app.route('/api/status', methods=['GET'])
@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({
        'wallet_connected': True,
        'network': os.getenv('SOLANA_RPC_URL', 'mainnet'),
        'balance': 0.0,
        'services': {
            'backend': 'healthy',
            'database': 'connected',
            'rust_service': 'connecting'
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
