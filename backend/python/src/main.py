from flask import Flask, jsonify
from flask_cors import CORS

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
