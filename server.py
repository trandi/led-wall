from flask import Flask, send_from_directory, request, jsonify
from flask_sock import Sock
from wled import WLEDDriver
from sand import sand_bp, start_simulation

# Central Server State
class ServerState:
    def __init__(self):
        self.mode = "camera"
        self.clients = set()
    
    def get_mode(self):
        return self.mode
        
    def broadcast(self, data):
        for client in list(self.clients):
            try:
                client.send(bytes(data))
            except:
                pass

# App Setup
app = Flask(__name__, static_folder='static')
sock_app = Sock(app)
app.register_blueprint(sand_bp)

# Sub-modules
wled = WLEDDriver(ip="192.168.0.66", port=4048)
state = ServerState()

# Start Physics Thread
start_simulation(state, wled.send)

import json
import os

SCORE_FILE = 'scores.json'

def get_scores():
    if not os.path.exists(SCORE_FILE):
        return [0, 0, 0]
    with open(SCORE_FILE, 'r') as f:
        try:
            return json.load(f)
        except:
            return [0, 0, 0]

@app.route('/scores', methods=['GET', 'POST'])
def handle_scores():
    if request.method == 'POST':
        new_score = request.json.get('score', 0)
        scores = get_scores()
        scores.append(new_score)
        scores = sorted(scores, reverse=True)[:3]
        with open(SCORE_FILE, 'w') as f:
            json.dump(scores, f)
        return jsonify(scores)
    return jsonify(get_scores())

# --- Routes ---
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/set_mode', methods=['POST'])
def set_mode():
    state.mode = request.json.get("mode", "camera")
    print(f"Mode switched to: {state.mode}")
    return jsonify({"status": "ok", "mode": state.mode})

@sock_app.route('/stream')
def stream(ws):
    print("Browser WebSocket connected.")
    state.clients.add(ws)
    try:
        while True:
            data = ws.receive()
            if data and state.mode in ["camera", "snake"]:
                wled.send(data)
    except:
        pass
    finally:
        state.clients.remove(ws)

if __name__ == '__main__':
    print("Starting Modular Unified Server...")
    try:
        app.run(host='0.0.0.0', port=5443, ssl_context='adhoc')
    except Exception as e:
        print(f"pyOpenSSL not installed {e}, falling back to standard HTTP...")
        app.run(host='0.0.0.0', port=5000)
