let currentMode = "camera";
let ws;

// Handles switching tabs
function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.mode-section').forEach(s => s.classList.remove('active'));
    document.getElementById('tab-' + mode).classList.add('active');
    document.getElementById('section-' + mode).classList.add('active');
    
    fetch('/set_mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: mode })
    });
}

// Global WebSocket setup
function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
    ws = new WebSocket(protocol + location.host + '/stream');
    ws.binaryType = 'arraybuffer';
    
    ws.onmessage = (event) => {
        // Hand off to the sand module if it exists
        if (currentMode === "sand" && typeof window.drawSandFrame === "function") {
            window.drawSandFrame(new Uint8Array(event.data));
        }
    };
    
    ws.onclose = () => setTimeout(connectWebSocket, 1000);
}

// Automatically connect WS for receiving data immediately
connectWebSocket();
