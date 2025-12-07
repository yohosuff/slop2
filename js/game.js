// Game constants
const SWIPE_THRESHOLD = 30;
const MAX_HEIGHT_RATIO = 0.6;
const WALL_LINE_WIDTH = 3;
const PLAYER_RADIUS_RATIO = 0.35;
const EXIT_PADDING_RATIO = 0.1;
const EXIT_SIZE_RATIO = 0.8;

// Game state
const game = {
    canvas: null,
    ctx: null,
    maze: [],
    player: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
    cellSize: 0,
    cols: 15,
    rows: 15,
    running: false,
    startTime: 0,
    animationId: null,
    touchStartX: 0,
    touchStartY: 0
};

// Initialize the game
function init() {
    game.canvas = document.getElementById('game-canvas');
    game.ctx = game.canvas.getContext('2d');
    
    // Set up event listeners
    document.getElementById('new-game-btn').addEventListener('click', startNewGame);
    document.getElementById('play-again-btn').addEventListener('click', () => {
        hideWinModal();
        startNewGame();
    });
    
    // Keyboard controls
    document.addEventListener('keydown', handleKeyPress);
    
    // Touch controls
    game.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    game.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    game.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Mouse controls (fallback)
    game.canvas.addEventListener('mousedown', (e) => {
        const rect = game.canvas.getBoundingClientRect();
        game.touchStartX = e.clientX - rect.left;
        game.touchStartY = e.clientY - rect.top;
    });
    
    game.canvas.addEventListener('mouseup', (e) => {
        const rect = game.canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;
        handleSwipe(endX, endY);
    });
    
    // Resize canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Start first game
    startNewGame();
}

// Resize canvas to maintain square aspect ratio
function resizeCanvas() {
    const container = game.canvas.parentElement;
    const size = Math.min(container.clientWidth, window.innerHeight * MAX_HEIGHT_RATIO);
    game.canvas.width = size;
    game.canvas.height = size;
    game.cellSize = size / game.cols;
    
    if (game.running) {
        draw();
    }
}

// Start a new game
function startNewGame() {
    game.maze = generateMaze(game.cols, game.rows);
    game.player = { x: 0, y: 0 };
    game.exit = { x: game.cols - 1, y: game.rows - 1 };
    game.running = true;
    game.startTime = Date.now();
    
    if (game.animationId) {
        cancelAnimationFrame(game.animationId);
    }
    
    gameLoop();
}

// Generate maze using recursive backtracking
function generateMaze(cols, rows) {
    const maze = [];
    
    // Initialize maze with all walls
    for (let y = 0; y < rows; y++) {
        maze[y] = [];
        for (let x = 0; x < cols; x++) {
            maze[y][x] = {
                walls: { top: true, right: true, bottom: true, left: true },
                visited: false
            };
        }
    }
    
    // Recursive backtracking algorithm
    const stack = [];
    const startCell = { x: 0, y: 0 };
    maze[startCell.y][startCell.x].visited = true;
    stack.push(startCell);
    
    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors = getUnvisitedNeighbors(current, maze, cols, rows);
        
        if (neighbors.length > 0) {
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            removeWalls(current, next, maze);
            maze[next.y][next.x].visited = true;
            stack.push(next);
        } else {
            stack.pop();
        }
    }
    
    return maze;
}

// Get unvisited neighbors
function getUnvisitedNeighbors(cell, maze, cols, rows) {
    const neighbors = [];
    const { x, y } = cell;
    
    if (y > 0 && !maze[y - 1][x].visited) neighbors.push({ x, y: y - 1, dir: 'top' });
    if (x < cols - 1 && !maze[y][x + 1].visited) neighbors.push({ x: x + 1, y, dir: 'right' });
    if (y < rows - 1 && !maze[y + 1][x].visited) neighbors.push({ x, y: y + 1, dir: 'bottom' });
    if (x > 0 && !maze[y][x - 1].visited) neighbors.push({ x: x - 1, y, dir: 'left' });
    
    return neighbors;
}

// Remove walls between two cells
function removeWalls(current, next, maze) {
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    
    if (dx === 1) {
        maze[current.y][current.x].walls.right = false;
        maze[next.y][next.x].walls.left = false;
    } else if (dx === -1) {
        maze[current.y][current.x].walls.left = false;
        maze[next.y][next.x].walls.right = false;
    } else if (dy === 1) {
        maze[current.y][current.x].walls.bottom = false;
        maze[next.y][next.x].walls.top = false;
    } else if (dy === -1) {
        maze[current.y][current.x].walls.top = false;
        maze[next.y][next.x].walls.bottom = false;
    }
}

// Handle keyboard input
function handleKeyPress(e) {
    if (!game.running) return;
    
    const key = e.key.toLowerCase();
    let moved = false;
    
    switch (key) {
        case 'arrowup':
        case 'w':
            moved = movePlayer(0, -1);
            break;
        case 'arrowdown':
        case 's':
            moved = movePlayer(0, 1);
            break;
        case 'arrowleft':
        case 'a':
            moved = movePlayer(-1, 0);
            break;
        case 'arrowright':
        case 'd':
            moved = movePlayer(1, 0);
            break;
    }
    
    if (moved) {
        e.preventDefault();
    }
}

// Handle touch start
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = game.canvas.getBoundingClientRect();
    game.touchStartX = touch.clientX - rect.left;
    game.touchStartY = touch.clientY - rect.top;
}

// Handle touch move (prevent scrolling)
function handleTouchMove(e) {
    e.preventDefault();
}

// Handle touch end
function handleTouchEnd(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = game.canvas.getBoundingClientRect();
    const endX = touch.clientX - rect.left;
    const endY = touch.clientY - rect.top;
    
    handleSwipe(endX, endY);
}

// Handle swipe gesture
function handleSwipe(endX, endY) {
    if (!game.running) return;
    
    const dx = endX - game.touchStartX;
    const dy = endY - game.touchStartY;
    
    if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_THRESHOLD) {
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            movePlayer(dx > 0 ? 1 : -1, 0);
        } else {
            // Vertical swipe
            movePlayer(0, dy > 0 ? 1 : -1);
        }
    }
}

// Move player
function movePlayer(dx, dy) {
    const newX = game.player.x + dx;
    const newY = game.player.y + dy;
    
    // Check boundaries
    if (newX < 0 || newX >= game.cols || newY < 0 || newY >= game.rows) {
        return false;
    }
    
    // Check walls
    const cell = game.maze[game.player.y][game.player.x];
    if (dx === 1 && cell.walls.right) return false;
    if (dx === -1 && cell.walls.left) return false;
    if (dy === 1 && cell.walls.bottom) return false;
    if (dy === -1 && cell.walls.top) return false;
    
    // Move player
    game.player.x = newX;
    game.player.y = newY;
    
    // Check win condition
    if (game.player.x === game.exit.x && game.player.y === game.exit.y) {
        winGame();
    }
    
    return true;
}

// Win the game
function winGame() {
    game.running = false;
    const elapsed = Math.floor((Date.now() - game.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('final-time').textContent = timeString;
    showWinModal();
}

// Show win modal
function showWinModal() {
    document.getElementById('win-modal').classList.remove('hidden');
}

// Hide win modal
function hideWinModal() {
    document.getElementById('win-modal').classList.add('hidden');
}

// Update timer
function updateTimer() {
    if (!game.running) return;
    
    const elapsed = Math.floor((Date.now() - game.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Game loop
function gameLoop() {
    updateTimer();
    draw();
    
    if (game.running) {
        game.animationId = requestAnimationFrame(gameLoop);
    }
}

// Draw the game
function draw() {
    const ctx = game.ctx;
    const cellSize = game.cellSize;
    
    // Clear canvas
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);
    
    // Draw maze
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = WALL_LINE_WIDTH;
    
    for (let y = 0; y < game.rows; y++) {
        for (let x = 0; x < game.cols; x++) {
            const cell = game.maze[y][x];
            const px = x * cellSize;
            const py = y * cellSize;
            
            ctx.beginPath();
            if (cell.walls.top) {
                ctx.moveTo(px, py);
                ctx.lineTo(px + cellSize, py);
            }
            if (cell.walls.right) {
                ctx.moveTo(px + cellSize, py);
                ctx.lineTo(px + cellSize, py + cellSize);
            }
            if (cell.walls.bottom) {
                ctx.moveTo(px, py + cellSize);
                ctx.lineTo(px + cellSize, py + cellSize);
            }
            if (cell.walls.left) {
                ctx.moveTo(px, py);
                ctx.lineTo(px, py + cellSize);
            }
            ctx.stroke();
        }
    }
    
    // Draw exit
    ctx.fillStyle = '#27ae60';
    const exitX = game.exit.x * cellSize;
    const exitY = game.exit.y * cellSize;
    ctx.fillRect(exitX + cellSize * EXIT_PADDING_RATIO, exitY + cellSize * EXIT_PADDING_RATIO, 
                 cellSize * EXIT_SIZE_RATIO, cellSize * EXIT_SIZE_RATIO);
    
    // Draw player
    ctx.fillStyle = '#667eea';
    const playerX = game.player.x * cellSize;
    const playerY = game.player.y * cellSize;
    ctx.beginPath();
    ctx.arc(playerX + cellSize / 2, playerY + cellSize / 2, cellSize * PLAYER_RADIUS_RATIO, 0, Math.PI * 2);
    ctx.fill();
}

// Start the game when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
