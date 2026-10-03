const sandPad = document.getElementById('sandPad');
const sandCtx = sandPad.getContext('2d', { willReadFrequently: true });
let currentElement = 1;
let isDrawing = false;
let lastSendTime = 0;

// Expose draw frame function to the WebSocket in main.js
window.drawSandFrame = function(rgbData) {
    const imgData = sandCtx.createImageData(56, 32);
    let j = 0;
    for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i] = rgbData[j++];     
        imgData.data[i+1] = rgbData[j++];   
        imgData.data[i+2] = rgbData[j++];   
        imgData.data[i+3] = 255;            
    }
    sandCtx.putImageData(imgData, 0, 0);
};

// UI Tool Selection
document.querySelectorAll('.tool').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        currentElement = parseInt(e.target.dataset.el);
    });
});

document.getElementById('btn-clear').addEventListener('click', () => { 
    fetch('/clear', { method: 'POST' }); 
});

// Touch and Mouse interaction
function sendDraw(clientX, clientY) {
    if (currentMode !== "sand") return;
    const rect = sandPad.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * 56);
    const y = Math.floor(((clientY - rect.top) / rect.height) * 32);

    const now = Date.now();
    if (now - lastSendTime > 33) { 
        fetch('/draw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: x, y: y, element: currentElement })
        });
        lastSendTime = now;
    }
}

// Mouse events
sandPad.addEventListener('mousedown', (e) => { isDrawing = true; sendDraw(e.clientX, e.clientY); });
window.addEventListener('mouseup', () => { isDrawing = false; });
sandPad.addEventListener('mousemove', (e) => { if (isDrawing) sendDraw(e.clientX, e.clientY); });

// Touch events
sandPad.addEventListener('touchstart', (e) => { 
    isDrawing = true; e.preventDefault(); sendDraw(e.touches[0].clientX, e.touches[0].clientY); 
});
window.addEventListener('touchend', () => { isDrawing = false; });
sandPad.addEventListener('touchmove', (e) => { 
    if (isDrawing) { e.preventDefault(); sendDraw(e.touches[0].clientX, e.touches[0].clientY); } 
});
