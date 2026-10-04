const video = document.getElementById('videoElement');
const canvas = document.getElementById('outCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const startBtn = document.getElementById('startBtn');

startBtn.addEventListener('click', async () => {
    // Ensure socket is connected before streaming
    if (!ws || ws.readyState !== WebSocket.OPEN) connectWebSocket();
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        video.srcObject = stream;
        startBtn.innerText = "STREAMING TO WLED...";
        startBtn.disabled = true;
        requestAnimationFrame(processFrame);
    } catch (err) {
        alert("Camera access denied! Error: " + err);
    }
});

const printBtn = document.getElementById('printBtn');

printBtn.addEventListener('click', () => {
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    printBtn.disabled = true;
    const oldText = printBtn.innerText;
    printBtn.innerText = "PRINTING...";
    
    const targetAspect = 56 / 32;
    let cropWidth = video.videoWidth;
    let cropHeight = video.videoWidth / targetAspect;

    if (cropHeight > video.videoHeight) {
        cropHeight = video.videoHeight;
        cropWidth = video.videoHeight * targetAspect;
    }    

    const startX = (video.videoWidth - cropWidth) / 2;
    const startY = (video.videoHeight - cropHeight) / 2;
    
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = cropWidth * 2;
    captureCanvas.height = cropHeight * 2;
    const capCtx = captureCanvas.getContext('2d');
    
    capCtx.filter = 'contrast(150%) saturate(150%)';
    capCtx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth * 2, cropHeight * 2);
    
    captureCanvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'print_image.png');
        const printError = document.getElementById('printError');
        
        try {
            const res = await fetch('/save_and_print', { method: 'POST', body: formData });
            const text = await res.text();
            if (res.ok && text.includes("Success")) {
                printBtn.innerText = "DONE!";
            } else {
                printBtn.innerText = "ERROR!";
                printError.innerText = text;
                printError.style.display = 'block';
                console.error(text);
            }
        } catch (err) {
            console.error(err);
            printBtn.innerText = "ERROR!";
            printError.innerText = "Network error or server unreachable";
            printError.style.display = 'block';
        }
        
        setTimeout(() => {
            printBtn.innerText = oldText;
            printBtn.disabled = false;
            printError.style.display = 'none';
        }, 5000);
    }, 'image/png');
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

        const startX = (video.videoWidth - cropWidth) / 2;
        const startY = (video.videoHeight - cropHeight) / 2;
                
        ctx.filter = 'contrast(150%) saturate(150%)';
        ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, 56, 32);
        
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
