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

@app.route('/save_and_print', methods=['POST'])
def save_and_print():
    if 'file' not in request.files:
        return "No file provided", 400
        
    file = request.files['file']
    if file.filename == '':
        return "No selected file", 400
        
    image_path = 'print_image.png'
    file.save(image_path)
    
    # The PI_IP_ADDRESS can be set via env var, or changed here directly.
    PI_IP_ADDRESS = os.environ.get("PI_IP", "192.168.0.137") 
    url = f"http://{PI_IP_ADDRESS}:5000/print"
    
    try:
        import urllib.request
        import mimetypes
        import uuid
        
        print(f"Sending job to Raspberry Pi at {url}...")
        boundary = uuid.uuid4().hex
        
        with open(image_path, 'rb') as img_file:
            img_data = img_file.read()
            
        data = []
        data.append(f'--{boundary}')
        data.append('Content-Disposition: form-data; name="file"; filename="print_image.png"')
        data.append('Content-Type: image/png')
        data.append('')
        data.append(img_data)
        data.append(f'--{boundary}--')
        data.append('')
        
        # Build the multipart body
        body = bytearray()
        for i, item in enumerate(data):
            if isinstance(item, bytes):
                body.extend(item)
            else:
                body.extend(item.encode('utf-8'))
            if i != len(data) - 1:
                body.extend(b'\r\n')
                
        req = urllib.request.Request(url, data=body)
        req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
        
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                response_text = response.read().decode('utf-8', errors='ignore')
                if "Print Job Received!" in response_text:
                    print("Success! The image is printing.")
                    return "Success! Print Job Received!", 200
                else:
                    print("Failed to print. Server returned an error page.")
                    return response_text, 500
        except urllib.error.HTTPError as e:
            response_text = e.read().decode('utf-8', errors='ignore')
            return response_text, 500
                
    except Exception as e:
        print(f"Network error: {e}")
        return f"Network error: {e}", 500

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
