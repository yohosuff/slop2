// Game Configuration
const CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    roadWidth: 400,
    laneWidth: 100,
    playerSpeed: 5,
    maxSpeed: 15,
    acceleration: 0.2,
    deceleration: 0.3,
    turnSpeed: 6,
    enemySpeed: 3,
    enemySpawnRate: 0.02,
    roadMarkingSpeed: 8
};

// Game State
const game = {
    canvas: null,
    ctx: null,
    running: false,
    score: 0,
    distance: 0,
    speed: 0,
    player: null,
    enemies: [],
    roadMarkings: [],
    roadOffset: 0,
    keys: {},
    touchLeft: false,
    touchRight: false,
    lastTime: 0
};

// Player Car
class Player {
    constructor() {
        this.x = CONFIG.canvasWidth / 2;
        this.y = CONFIG.canvasHeight - 100;
        this.width = 40;
        this.height = 60;
        this.color = '#FF4444';
    }

    update(deltaTime) {
        // Handle steering
        let steering = 0;
        if (game.keys.ArrowLeft || game.keys.KeyA || game.touchLeft) {
            steering = -1;
        }
        if (game.keys.ArrowRight || game.keys.KeyD || game.touchRight) {
            steering = 1;
        }

        // Update position
        this.x += steering * CONFIG.turnSpeed;

        // Keep player on road
        const roadLeft = (CONFIG.canvasWidth - CONFIG.roadWidth) / 2 + 10;
        const roadRight = roadLeft + CONFIG.roadWidth - 10;
        this.x = Math.max(roadLeft, Math.min(roadRight - this.width, this.x));

        // Update speed
        if (game.keys.ArrowUp || game.keys.KeyW) {
            game.speed = Math.min(CONFIG.maxSpeed, game.speed + CONFIG.acceleration);
        } else if (game.keys.ArrowDown || game.keys.KeyS) {
            game.speed = Math.max(0, game.speed - CONFIG.deceleration);
        } else {
            // Auto-accelerate
            game.speed = Math.min(CONFIG.playerSpeed, game.speed + CONFIG.acceleration * 0.5);
        }
    }

    draw(ctx) {
        // Car body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Car highlights
        ctx.fillStyle = '#FF6666';
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, 20);
        
        // Windshield
        ctx.fillStyle = '#88CCFF';
        ctx.fillRect(this.x + 8, this.y + 10, this.width - 16, 12);
        
        // Wheels
        ctx.fillStyle = '#222';
        ctx.fillRect(this.x - 3, this.y + 10, 6, 15);
        ctx.fillRect(this.x + this.width - 3, this.y + 10, 6, 15);
        ctx.fillRect(this.x - 3, this.y + this.height - 25, 6, 15);
        ctx.fillRect(this.x + this.width - 3, this.y + this.height - 25, 6, 15);
    }
}

// Enemy Car
class Enemy {
    constructor() {
        const lane = Math.floor(Math.random() * 4);
        const roadLeft = (CONFIG.canvasWidth - CONFIG.roadWidth) / 2;
        this.x = roadLeft + lane * CONFIG.laneWidth + CONFIG.laneWidth / 2 - 20;
        this.y = -80;
        this.width = 40;
        this.height = 60;
        this.speed = CONFIG.enemySpeed + Math.random() * 2;
        this.colors = ['#44FF44', '#4444FF', '#FFFF44', '#FF44FF', '#44FFFF'];
        this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    update(deltaTime) {
        this.y += this.speed + game.speed;
    }

    draw(ctx) {
        // Car body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Car highlights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(this.x + 5, this.y + this.height - 25, this.width - 10, 20);
        
        // Back window
        ctx.fillStyle = '#88CCFF';
        ctx.fillRect(this.x + 8, this.y + this.height - 22, this.width - 16, 12);
        
        // Wheels
        ctx.fillStyle = '#222';
        ctx.fillRect(this.x - 3, this.y + 10, 6, 15);
        ctx.fillRect(this.x + this.width - 3, this.y + 10, 6, 15);
        ctx.fillRect(this.x - 3, this.y + this.height - 25, 6, 15);
        ctx.fillRect(this.x + this.width - 3, this.y + this.height - 25, 6, 15);
    }

    isOffScreen() {
        return this.y > CONFIG.canvasHeight;
    }
}

// Road Marking
class RoadMarking {
    constructor(y) {
        this.y = y;
        this.height = 40;
        this.width = 8;
    }

    update(deltaTime) {
        this.y += CONFIG.roadMarkingSpeed + game.speed;
    }

    draw(ctx) {
        const roadLeft = (CONFIG.canvasWidth - CONFIG.roadWidth) / 2;
        ctx.fillStyle = '#FFF';
        
        // Draw lane markings
        for (let i = 1; i < 4; i++) {
            const x = roadLeft + i * CONFIG.laneWidth - this.width / 2;
            ctx.fillRect(x, this.y, this.width, this.height);
        }
    }

    isOffScreen() {
        return this.y > CONFIG.canvasHeight;
    }
}

// Collision Detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Initialize Game
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Input handlers
    setupInputHandlers();
    
    // UI handlers
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    const aspectRatio = CONFIG.canvasWidth / CONFIG.canvasHeight;
    
    let width = container.clientWidth;
    let height = container.clientHeight;
    
    if (width / height > aspectRatio) {
        width = height * aspectRatio;
    } else {
        height = width / aspectRatio;
    }
    
    game.canvas.width = CONFIG.canvasWidth;
    game.canvas.height = CONFIG.canvasHeight;
}

function setupInputHandlers() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
        game.keys[e.code] = true;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        game.keys[e.code] = false;
    });
    
    // Touch controls
    game.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    game.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    game.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Mouse fallback
    game.canvas.addEventListener('mousedown', handleMouseDown);
    game.canvas.addEventListener('mousemove', handleMouseMove);
    game.canvas.addEventListener('mouseup', handleMouseUp);
}

function handleTouchStart(e) {
    e.preventDefault();
    updateTouchControls(e.touches);
}

function handleTouchMove(e) {
    e.preventDefault();
    updateTouchControls(e.touches);
}

function handleTouchEnd(e) {
    e.preventDefault();
    if (e.touches.length === 0) {
        game.touchLeft = false;
        game.touchRight = false;
    } else {
        updateTouchControls(e.touches);
    }
}

function updateTouchControls(touches) {
    game.touchLeft = false;
    game.touchRight = false;
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const rect = game.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        
        if (x < rect.width / 2) {
            game.touchLeft = true;
        } else {
            game.touchRight = true;
        }
    }
}

let mouseDown = false;

function handleMouseDown(e) {
    mouseDown = true;
    handleMouseMove(e);
}

function handleMouseMove(e) {
    if (!mouseDown || !game.running) return;
    
    const rect = game.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    game.touchLeft = false;
    game.touchRight = false;
    
    if (x < rect.width / 2) {
        game.touchLeft = true;
    } else {
        game.touchRight = true;
    }
}

function handleMouseUp(e) {
    mouseDown = false;
    game.touchLeft = false;
    game.touchRight = false;
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    resetGame();
    game.running = true;
    game.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    document.getElementById('game-over-screen').classList.add('hidden');
    startGame();
}

function resetGame() {
    game.score = 0;
    game.distance = 0;
    game.speed = 0;
    game.player = new Player();
    game.enemies = [];
    game.roadMarkings = [];
    game.roadOffset = 0;
    
    // Initialize road markings
    for (let i = 0; i < CONFIG.canvasHeight; i += 80) {
        game.roadMarkings.push(new RoadMarking(i));
    }
}

function gameLoop(currentTime) {
    if (!game.running) return;
    
    const deltaTime = (currentTime - game.lastTime) / 1000;
    game.lastTime = currentTime;
    
    update(deltaTime);
    render();
    
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // Update player
    game.player.update(deltaTime);
    
    // Update distance and score
    game.distance += game.speed * 0.1;
    game.score = Math.floor(game.distance);
    
    // Spawn enemies
    if (Math.random() < CONFIG.enemySpawnRate) {
        game.enemies.push(new Enemy());
    }
    
    // Update enemies
    for (let i = game.enemies.length - 1; i >= 0; i--) {
        game.enemies[i].update(deltaTime);
        
        // Check collision with player
        if (checkCollision(game.player, game.enemies[i])) {
            gameOver();
            return;
        }
        
        // Remove off-screen enemies
        if (game.enemies[i].isOffScreen()) {
            game.enemies.splice(i, 1);
        }
    }
    
    // Update road markings
    for (let i = game.roadMarkings.length - 1; i >= 0; i--) {
        game.roadMarkings[i].update(deltaTime);
        
        if (game.roadMarkings[i].isOffScreen()) {
            game.roadMarkings.splice(i, 1);
        }
    }
    
    // Add new road markings at the top
    if (game.roadMarkings.length === 0 || game.roadMarkings[0].y > 0) {
        game.roadMarkings.unshift(new RoadMarking(-40));
    }
    
    // Update UI
    document.getElementById('scoreValue').textContent = game.score;
    document.getElementById('speedValue').textContent = Math.floor(game.speed * 10);
}

function render() {
    const ctx = game.ctx;
    
    // Clear canvas
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    
    // Draw road
    const roadLeft = (CONFIG.canvasWidth - CONFIG.roadWidth) / 2;
    ctx.fillStyle = '#444';
    ctx.fillRect(roadLeft, 0, CONFIG.roadWidth, CONFIG.canvasHeight);
    
    // Road edges
    ctx.fillStyle = '#FFF';
    ctx.fillRect(roadLeft - 5, 0, 5, CONFIG.canvasHeight);
    ctx.fillRect(roadLeft + CONFIG.roadWidth, 0, 5, CONFIG.canvasHeight);
    
    // Draw road markings
    game.roadMarkings.forEach(marking => marking.draw(ctx));
    
    // Draw enemies
    game.enemies.forEach(enemy => enemy.draw(ctx));
    
    // Draw player
    game.player.draw(ctx);
}

function gameOver() {
    game.running = false;
    document.getElementById('finalScore').textContent = game.score;
    document.getElementById('finalDistance').textContent = Math.floor(game.distance);
    document.getElementById('game-over-screen').classList.remove('hidden');
}

// Start the game when page loads
window.addEventListener('load', init);
