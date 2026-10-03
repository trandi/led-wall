import time
import random
import threading
from flask import Blueprint, request, jsonify

WIDTH = 56
HEIGHT = 32
FPS = 30

EMPTY = 0; SAND = 1; WATER = 2; WALL = 3
COLORS = {
    EMPTY: (0, 0, 0),
    SAND: (255, 190, 60),
    WATER: (20, 100, 255),
    WALL: (120, 120, 120)
}
grid = [[EMPTY for _ in range(WIDTH)] for _ in range(HEIGHT)]

sand_bp = Blueprint('sand', __name__)

@sand_bp.route('/draw', methods=['POST'])
def draw():
    data = request.json
    x = int(data.get('x', 0))
    y = int(data.get('y', 0))
    element = int(data.get('element', SAND))
    
    radius = 1 if element == WALL else 0

    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx*dx + dy*dy <= radius*radius:
                nx, ny = x + dx, y + dy
                if 0 <= nx < WIDTH and 0 <= ny < HEIGHT:
                    if element == EMPTY:  
                        grid[ny][nx] = EMPTY
                    elif element == WALL: 
                        grid[ny][nx] = WALL
                    elif element == SAND and grid[ny][nx] == WATER:
                        for ty in range(ny - 1, -1, -1):
                            if grid[ty][nx] == EMPTY:
                                grid[ty][nx] = WATER
                                break
                        grid[ny][nx] = SAND
                    elif grid[ny][nx] == EMPTY:
                        grid[ny][nx] = element
    return jsonify({"status": "ok"})

@sand_bp.route('/clear', methods=['POST'])
def clear():
    global grid
    grid = [[EMPTY for _ in range(WIDTH)] for _ in range(HEIGHT)]
    return jsonify({"status": "ok"})

def update_grid():
    global grid
    for y in range(HEIGHT - 2, -1, -1):
        for x in range(WIDTH):
            if grid[y][x] == SAND:
                dir = random.choice([-1, 1])
                if grid[y+1][x] == EMPTY or grid[y+1][x] == WATER:
                    grid[y+1][x], grid[y][x] = grid[y][x], grid[y+1][x]
                elif 0 <= x + dir < WIDTH and (grid[y+1][x+dir] == EMPTY or grid[y+1][x+dir] == WATER):
                    grid[y+1][x+dir], grid[y][x] = grid[y][x], grid[y+1][x+dir]
                elif 0 <= x - dir < WIDTH and (grid[y+1][x-dir] == EMPTY or grid[y+1][x-dir] == WATER):
                    grid[y+1][x-dir], grid[y][x] = grid[y][x], grid[y+1][x-dir]
            
            elif grid[y][x] == WATER:
                dir = random.choice([-1, 1])
                if grid[y+1][x] == EMPTY:
                    grid[y+1][x], grid[y][x] = 4, EMPTY
                elif 0 <= x + dir < WIDTH and grid[y+1][x+dir] == EMPTY:
                    grid[y+1][x+dir], grid[y][x] = 4, EMPTY
                elif 0 <= x - dir < WIDTH and grid[y+1][x-dir] == EMPTY:
                    grid[y+1][x-dir], grid[y][x] = 4, EMPTY
                elif 0 <= x + dir < WIDTH and grid[y][x+dir] == EMPTY:
                     grid[y][x+dir], grid[y][x] = 4, EMPTY
                elif 0 <= x - dir < WIDTH and grid[y][x-dir] == EMPTY:
                     grid[y][x-dir], grid[y][x] = 4, EMPTY

    for y in range(HEIGHT):
        for x in range(WIDTH):
            if grid[y][x] == 4:
                grid[y][x] = WATER

def start_simulation(state_manager, send_wled_func):
    def loop():
        while True:
            if state_manager.get_mode() == "sand":
                update_grid()
                pixel_data = bytearray(WIDTH * HEIGHT * 3)
                idx = 0
                for y in range(HEIGHT):
                    for x in range(WIDTH):
                        c = COLORS[grid[y][x]]
                        pixel_data[idx] = c[0]
                        pixel_data[idx+1] = c[1]
                        pixel_data[idx+2] = c[2]
                        idx += 3
                
                send_wled_func(pixel_data)
                state_manager.broadcast(pixel_data)
            time.sleep(1.0 / FPS)
            
    threading.Thread(target=loop, daemon=True).start()
