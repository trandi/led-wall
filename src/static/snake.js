const snakePad = document.getElementById('snakePad');
const snakeCtx = snakePad.getContext('2d', { willReadFrequently: true });
const scoreDisplay = document.getElementById('snakeScore');

let snake = [{x: 28, y: 16}];
let sdir = {x: 1, y: 0};
let nextDir = {x: 1, y: 0};
let score = 0;
let baseSpeed = 200; // ms per frame (starts slow)
let lastTick = 0;

let isGameOver = false;
let gameOverFrame = 0;

// Random bright colors for apples
const appleColors = [
    [255, 0, 0],   // Red
    [255, 255, 0], // Yellow
    [255, 0, 255], // Magenta
    [0, 255, 255], // Cyan
    [255, 128, 0]  // Orange
];
let apple = {x: 10, y: 10, color: appleColors[0]};

window.setSnakeDir = function(dx, dy) {
    if (sdir.x === -dx && sdir.y === -dy) return;
    nextDir = {x: dx, y: dy};
};

function spawnApple() {
    let valid = false;
    let ax, ay;
    while (!valid) {
        ax = Math.floor(Math.random() * 56);
        ay = Math.floor(Math.random() * 32);
        valid = true;
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === ax && snake[i].y === ay) {
                valid = false;
                break;
            }
        }
    }
    const c = appleColors[Math.floor(Math.random() * appleColors.length)];
    apple = {x: ax, y: ay, color: c};
}

let topScores = [0, 0, 0];

// Fetch initial scores on load
fetch('/scores').then(r => r.json()).then(data => topScores = data);

const font3x5 = {
    'A':[2,5,7,5,5], 'B':[6,5,6,5,6], 'C':[7,4,4,4,7], 'D':[6,5,5,5,6],
    'E':[7,4,6,4,7], 'F':[7,4,6,4,4], 'G':[7,4,5,5,7], 'H':[5,5,7,5,5],
    'I':[7,2,2,2,7], 'J':[3,1,1,5,2], 'K':[5,5,6,5,5], 'L':[4,4,4,4,7],
    'M':[5,7,7,5,5], 'N':[5,5,7,5,5], 'O':[2,5,5,5,2], 'P':[6,5,6,4,4],
    'Q':[2,5,5,6,3], 'R':[6,5,6,5,5], 'S':[7,4,7,1,7], 'T':[7,2,2,2,2],
    'U':[5,5,5,5,7], 'V':[5,5,5,2,2], 'W':[5,5,7,7,5], 'X':[5,5,2,5,5],
    'Y':[5,5,2,2,2], 'Z':[7,1,2,4,7], 
    '0':[7,5,5,5,7], '1':[2,6,2,2,7], '2':[7,1,7,4,7], '3':[7,1,3,1,7], 
    '4':[5,5,7,1,1], '5':[7,4,7,1,7], '6':[7,4,7,5,7], '7':[7,1,2,2,2], 
    '8':[7,5,7,5,7], '9':[7,5,7,1,7], ':':[0,2,0,2,0], ' ':[0,0,0,0,0]
};

function drawTextCentered(str, py, color, rgbData) {
    let cx = Math.floor(28 - ((str.length * 4) - 1) / 2);
    for(let i=0; i<str.length; i++) {
        let char = str[i].toUpperCase();
        let glyph = font3x5[char] || font3x5[' '];
        for(let r=0; r<5; r++) {
            let row = glyph[r];
            for(let c=0; c<3; c++) {
                if ((row >> (2-c)) & 1) {
                    let tx = cx + c;
                    let ty = py + r;
                    if(tx>=0 && tx<56 && ty>=0 && ty<32) {
                        let idx = (ty * 56 + tx) * 3;
                        rgbData[idx] = color[0];
                        rgbData[idx+1] = color[1];
                        rgbData[idx+2] = color[2];
                    }
                }
            }
        }
        cx += 4;
    }
}

function drawGameOver(flashState, frameCount) {
    // Create base background
    const rgbData = new Uint8Array(56 * 32 * 3);
    let bg = flashState ? 255 : 0;
    for(let i=0; i<rgbData.length; i++) rgbData[i] = bg;
    
    // Draw Apple (inverted)
    let aIdx = (apple.y * 56 + apple.x) * 3;
    rgbData[aIdx] = flashState ? 255 - apple.color[0] : apple.color[0];
    rgbData[aIdx+1] = flashState ? 255 - apple.color[1] : apple.color[1];
    rgbData[aIdx+2] = flashState ? 255 - apple.color[2] : apple.color[2];
    
    // Draw Snake (inverted)
    for (let i = 0; i < snake.length; i++) {
        let sIdx = (snake[i].y * 56 + snake[i].x) * 3;
        rgbData[sIdx] = flashState ? 255 : 0;
        rgbData[sIdx+1] = flashState ? (i===0 ? 0 : 75) : (i===0 ? 255 : 180);
        rgbData[sIdx+2] = flashState ? 255 : 0;
    }
    
    // Overlay Crisp Pixel Text directly onto RGB data!
    if (frameCount <= 10) {
        // First Half: GAME OVER + SCORE
        drawTextCentered("GAME", 5, flashState ? [0,0,0] : [255,0,0], rgbData);
        drawTextCentered("OVER", 13, flashState ? [0,0,0] : [255,0,0], rgbData);
        drawTextCentered(score.toString(), 22, flashState ? [0,0,255] : [255,255,255], rgbData);
    } else {
        // Second Half: TOP 3 LEADERBOARD
        drawTextCentered("TOP 3", 2, flashState ? [0,0,0] : [255,215,0], rgbData);
        drawTextCentered("1: " + topScores[0], 10, flashState ? [0,0,255] : [255,255,255], rgbData);
        drawTextCentered("2: " + topScores[1], 17, flashState ? [0,0,255] : [255,255,255], rgbData);
        drawTextCentered("3: " + topScores[2], 24, flashState ? [0,0,255] : [255,255,255], rgbData);
    }
    
    // Send to WLED first
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(rgbData);
    }
    
    // Put composite image on browser canvas
    const imgData = snakeCtx.createImageData(56, 32);
    let j = 0;
    for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i] = rgbData[j++];
        imgData.data[i+1] = rgbData[j++];
        imgData.data[i+2] = rgbData[j++];
        imgData.data[i+3] = 255;
    }
    snakeCtx.putImageData(imgData, 0, 0);
}

function snakeLoop(timestamp) {
    requestAnimationFrame(snakeLoop);
    
    if (currentMode !== "snake") return;
    
    if (isGameOver) {
        if (timestamp - lastTick > 500) { // Slower flash speed
            lastTick = timestamp;
            gameOverFrame++;
            
            drawGameOver(gameOverFrame % 2 === 1, gameOverFrame);
            
            // Total 20 frames (10 for Game Over, 10 for Leaderboard) -> 5 full blinks each
            if (gameOverFrame > 20) { 
                isGameOver = false;
                snake = [{x: 28, y: 16}];
                score = 0;
                scoreDisplay.innerText = score;
                sdir = {x: 1, y: 0}; 
                nextDir = {x: 1, y: 0};
                spawnApple();
            }
        }
        return;
    }
    
    let currentSpeed = Math.max(40, baseSpeed - (score * 5));
    
    if (timestamp - lastTick > currentSpeed) {
        lastTick = timestamp;
        
        sdir = nextDir;
        let head = {x: snake[0].x + sdir.x, y: snake[0].y + sdir.y};
        
        let dead = false;
        if (head.x < 0 || head.x >= 56 || head.y < 0 || head.y >= 32) {
            dead = true;
        } else {
            for (let i = 0; i < snake.length; i++) {
                if (snake[i].x === head.x && snake[i].y === head.y) dead = true;
            }
        }
        
        if (dead) {
            isGameOver = true;
            gameOverFrame = 0;
            
            // Save score to server and fetch updated leaderboard
            fetch('/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score: score })
            }).then(r => r.json()).then(data => {
                topScores = data;
            });
            
            return;
        } else {
            snake.unshift(head); 
            if (head.x === apple.x && head.y === apple.y) {
                score++;
                scoreDisplay.innerText = score;
                spawnApple();
            } else {
                snake.pop(); 
            }
        }
        
        drawSnake();
    }
}

function drawSnake() {
    const rgbData = new Uint8Array(56 * 32 * 3);
    
    let aIdx = (apple.y * 56 + apple.x) * 3;
    rgbData[aIdx] = apple.color[0];
    rgbData[aIdx+1] = apple.color[1];
    rgbData[aIdx+2] = apple.color[2];
    
    for (let i = 0; i < snake.length; i++) {
        let sIdx = (snake[i].y * 56 + snake[i].x) * 3;
        rgbData[sIdx] = 0; 
        rgbData[sIdx+1] = i === 0 ? 255 : 180; 
        rgbData[sIdx+2] = 0; 
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(rgbData);
    }
    
    const imgData = snakeCtx.createImageData(56, 32);
    let j = 0;
    for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i] = rgbData[j++];
        imgData.data[i+1] = rgbData[j++];
        imgData.data[i+2] = rgbData[j++];
        imgData.data[i+3] = 255;
    }
    snakeCtx.putImageData(imgData, 0, 0);
}

requestAnimationFrame(snakeLoop);
