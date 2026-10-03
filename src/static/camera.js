const video = document.getElementById('videoElement');
const canvas = document.getElementById('outCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const startBtn = document.getElementById('startBtn');

startBtn.addEventListener('click', async () => {
    // Ensure socket is connected before streaming
    if (!ws || ws.readyState !== WebSocket.OPEN) connectWebSocket();
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 4000 } } 
        });
        video.srcObject = stream;
        startBtn.innerText = "STREAMING TO WLED...";
        startBtn.disabled = true;
        requestAnimationFrame(processFrame);
    } catch (err) {
        alert("Camera access denied! Error: " + err);
    }
});

function processFrame() {
    if (video.readyState === video.HAVE_ENOUGH_DATA && currentMode === "camera") {
        const targetAspect = 56 / 32;
        let cropWidth = video.videoWidth;
        let cropHeight = video.videoWidth / targetAspect;

        if (cropHeight > video.videoHeight) {
            cropHeight = video.videoHeight;
            cropWidth = video.videoHeight * targetAspect;
        }    
                
        ctx.filter = 'contrast(150%) saturate(150%)';
        ctx.drawImage(video, 0, 0, cropWidth, cropHeight, 0, 0, 56, 32);
        
        const imgData = ctx.getImageData(0, 0, 56, 32).data;
        const rgbData = new Uint8Array(56 * 32 * 3);
        
        let j = 0;
        for (let i = 0; i < imgData.length; i += 4) {
            rgbData[j++] = imgData[i];
            rgbData[j++] = imgData[i+1];
            rgbData[j++] = imgData[i+2];
        }
        
        // Use global 'ws' from main.js
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(rgbData);
        }
    }
    setTimeout(() => { requestAnimationFrame(processFrame); }, 33);
}
