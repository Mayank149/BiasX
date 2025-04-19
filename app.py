from flask import Flask, request, jsonify, send_from_directory
import os
from bias_detector import analyze_bias

app = Flask(__name__, static_folder='static')

# Serve static files
@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/analyzer')
def serve_analyzer():
    return send_from_directory('static', 'analyzer.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# API endpoint
@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    text = data.get('text', '')
    results = analyze_bias(text)
    return jsonify(results)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)