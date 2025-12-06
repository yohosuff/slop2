// Game configuration
const config = {
    tileSize: 40,
    canvasWidth: 800,
    canvasHeight: 600,
    playerSpeed: 3,
    enemySpeed: 1.5,
    visionDistance: 200,
    visionAngle: 60 // degrees
};

// Game state
const game = {
    canvas: null,
    ctx: null,
    running: false,
    player: null,
    enemies: [],
    keys: [],
    doors: [],
    walls: [],
    keysCollected: 0,
    totalKeys: 3,
    input: {
        up: false,
        down: false,
        left: false,
        right: false,
        touchX: null,
        touchY: null
    }
};

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.color = '#00ff00';
    }

    update() {
        const speed = config.playerSpeed;
        let dx = 0;
        let dy = 0;

        // Handle touch input
        if (game.input.touchX !== null && game.input.touchY !== null) {
            const distToTouch = Math.hypot(game.input.touchX - this.x, game.input.touchY - this.y);
            // Only move if touch point is far enough away to avoid oscillation
            if (distToTouch > speed * 2) {
                const angleToTouch = Math.atan2(game.input.touchY - this.y, game.input.touchX - this.x);
                dx = Math.cos(angleToTouch) * speed;
                dy = Math.sin(angleToTouch) * speed;
            }
        } else {
            // Handle keyboard input
            if (game.input.up) dy -= speed;
            if (game.input.down) dy += speed;
            if (game.input.left) dx -= speed;
            if (game.input.right) dx += speed;
        }

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const diagonalFactor = Math.SQRT1_2; // 1/sqrt(2) ≈ 0.707
            dx *= diagonalFactor;
            dy *= diagonalFactor;
        }

        // Try to move and check collisions
        const newX = this.x + dx;
        const newY = this.y + dy;

        if (!this.checkCollision(newX, this.y)) {
            this.x = newX;
        }
        if (!this.checkCollision(this.x, newY)) {
            this.y = newY;
        }

        // Keep player in bounds
        this.x = Math.max(this.size, Math.min(config.canvasWidth - this.size, this.x));
        this.y = Math.max(this.size, Math.min(config.canvasHeight - this.size, this.y));

        // Check key collection
        this.checkKeyCollection();
    }

    checkCollision(x, y) {
        // Check wall collisions
        for (const wall of game.walls) {
            if (x + this.size > wall.x && x - this.size < wall.x + wall.width &&
                y + this.size > wall.y && y - this.size < wall.y + wall.height) {
                return true;
            }
        }

        // Check door collisions (locked doors)
        for (const door of game.doors) {
            if (!door.open) {
                if (x + this.size > door.x && x - this.size < door.x + door.width &&
                    y + this.size > door.y && y - this.size < door.y + door.height) {
                    return true;
                }
            }
        }

        return false;
    }

    checkKeyCollection() {
        for (let i = game.keys.length - 1; i >= 0; i--) {
            const key = game.keys[i];
            const dist = Math.hypot(this.x - key.x, this.y - key.y);
            if (dist < this.size + key.size) {
                game.keys.splice(i, 1);
                game.keysCollected++;
                updateKeyCount();
                
                // Open a door if we have enough keys
                if (game.keysCollected <= game.doors.length) {
                    game.doors[game.keysCollected - 1].open = true;
                }
            }
        }
    }

    draw() {
        game.ctx.fillStyle = this.color;
        game.ctx.beginPath();
        game.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        game.ctx.fill();
        
        // Draw player direction indicator
        game.ctx.strokeStyle = '#00ff00';
        game.ctx.lineWidth = 3;
        game.ctx.beginPath();
        game.ctx.moveTo(this.x, this.y);
        game.ctx.lineTo(this.x, this.y - this.size - 5);
        game.ctx.stroke();
    }
}

// Enemy class with vision cone
class Enemy {
    constructor(x, y, patrolPoints) {
        this.x = x;
        this.y = y;
        this.size = 18;
        this.color = '#ff4444';
        this.patrolPoints = patrolPoints;
        this.currentPoint = 0;
        this.angle = 0;
        this.visionDistance = config.visionDistance;
        this.visionAngle = config.visionAngle * Math.PI / 180;
    }

    update() {
        // Move towards current patrol point
        const target = this.patrolPoints[this.currentPoint];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 5) {
            // Reached patrol point, move to next
            this.currentPoint = (this.currentPoint + 1) % this.patrolPoints.length;
        } else {
            // Move towards patrol point
            this.angle = Math.atan2(dy, dx);
            this.x += Math.cos(this.angle) * config.enemySpeed;
            this.y += Math.sin(this.angle) * config.enemySpeed;
        }

        // Check if player is in vision cone
        if (this.canSeePlayer()) {
            gameOver(false);
        }
    }

    canSeePlayer() {
        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const distToPlayer = Math.hypot(dx, dy);

        if (distToPlayer > this.visionDistance) {
            return false;
        }

        // Check if player is within vision angle
        const angleToPlayer = Math.atan2(dy, dx);
        let angleDiff = angleToPlayer - this.angle;

        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (Math.abs(angleDiff) > this.visionAngle / 2) {
            return false;
        }

        // Check if there's a wall blocking vision
        return !this.isVisionBlocked();
    }

    isVisionBlocked() {
        const steps = 20;
        const dx = (game.player.x - this.x) / steps;
        const dy = (game.player.y - this.y) / steps;

        for (let i = 0; i < steps; i++) {
            const checkX = this.x + dx * i;
            const checkY = this.y + dy * i;

            for (const wall of game.walls) {
                if (checkX > wall.x && checkX < wall.x + wall.width &&
                    checkY > wall.y && checkY < wall.y + wall.height) {
                    return true;
                }
            }
        }
        return false;
    }

    draw() {
        // Draw vision cone
        game.ctx.fillStyle = 'rgba(255, 100, 100, 0.2)';
        game.ctx.beginPath();
        game.ctx.moveTo(this.x, this.y);
        game.ctx.arc(this.x, this.y, this.visionDistance,
            this.angle - this.visionAngle / 2,
            this.angle + this.visionAngle / 2);
        game.ctx.lineTo(this.x, this.y);
        game.ctx.fill();

        // Draw enemy body
        game.ctx.fillStyle = this.color;
        game.ctx.beginPath();
        game.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        game.ctx.fill();

        // Draw direction indicator
        game.ctx.strokeStyle = '#ffffff';
        game.ctx.lineWidth = 2;
        game.ctx.beginPath();
        game.ctx.moveTo(this.x, this.y);
        game.ctx.lineTo(
            this.x + Math.cos(this.angle) * (this.size + 8),
            this.y + Math.sin(this.angle) * (this.size + 8)
        );
        game.ctx.stroke();
    }
}

// Key class
class Key {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 12;
        this.color = '#ffcc00';
        this.rotation = 0;
    }

    update() {
        this.rotation += 0.05;
    }

    draw() {
        game.ctx.save();
        game.ctx.translate(this.x, this.y);
        game.ctx.rotate(this.rotation);
        
        // Draw key shape
        game.ctx.fillStyle = this.color;
        game.ctx.fillRect(-this.size, -this.size / 3, this.size * 1.5, this.size / 1.5);
        game.ctx.fillRect(this.size / 2, -this.size / 1.5, this.size / 3, this.size / 3);
        game.ctx.fillRect(this.size / 2, this.size / 5, this.size / 3, this.size / 3);
        
        game.ctx.restore();

        // Draw glow
        game.ctx.shadowBlur = 15;
        game.ctx.shadowColor = this.color;
        game.ctx.fillStyle = this.color;
        game.ctx.beginPath();
        game.ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        game.ctx.fill();
        game.ctx.shadowBlur = 0;
    }
}

// Door class
class Door {
    constructor(x, y, width, height, vertical = true) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.vertical = vertical;
        this.open = false;
        this.color = '#8b4513';
        this.lockedColor = '#ff0000';
    }

    draw() {
        if (this.open) {
            // Draw open door
            game.ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
        } else {
            // Draw locked door
            game.ctx.fillStyle = this.lockedColor;
        }
        
        game.ctx.fillRect(this.x, this.y, this.width, this.height);

        if (!this.open) {
            // Draw lock symbol
            game.ctx.strokeStyle = '#ffcc00';
            game.ctx.lineWidth = 2;
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            game.ctx.strokeRect(centerX - 5, centerY, 10, 8);
            game.ctx.beginPath();
            game.ctx.arc(centerX, centerY, 5, Math.PI, 0, false);
            game.ctx.stroke();
        }
    }
}

// Wall class
class Wall {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = '#444444';
    }

    draw() {
        game.ctx.fillStyle = this.color;
        game.ctx.fillRect(this.x, this.y, this.width, this.height);
        game.ctx.strokeStyle = '#666666';
        game.ctx.lineWidth = 2;
        game.ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// Initialize game
function init() {
    game.canvas = document.getElementById('game-canvas');
    game.ctx = game.canvas.getContext('2d');

    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Setup input handlers
    setupInput();

    // Create level
    createLevel();

    // Start game loop
    game.running = true;
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    const maxWidth = Math.min(container.clientWidth - 40, config.canvasWidth);
    const maxHeight = Math.min(container.clientHeight - 100, config.canvasHeight);
    
    game.canvas.width = config.canvasWidth;
    game.canvas.height = config.canvasHeight;
    
    // Scale canvas to fit container while maintaining aspect ratio
    const scale = Math.min(maxWidth / config.canvasWidth, maxHeight / config.canvasHeight);
    game.canvas.style.width = (config.canvasWidth * scale) + 'px';
    game.canvas.style.height = (config.canvasHeight * scale) + 'px';
}

function setupInput() {
    // Keyboard input
    window.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                game.input.up = true;
                e.preventDefault();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                game.input.down = true;
                e.preventDefault();
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                game.input.left = true;
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                game.input.right = true;
                e.preventDefault();
                break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                game.input.up = false;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                game.input.down = false;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                game.input.left = false;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                game.input.right = false;
                break;
        }
    });

    // Touch input
    game.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    game.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    game.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Mouse input (fallback)
    game.canvas.addEventListener('mousedown', handleMouseDown);
    game.canvas.addEventListener('mousemove', handleMouseMove);
    game.canvas.addEventListener('mouseup', handleMouseUp);

    // Restart button
    document.getElementById('restart-btn').addEventListener('click', restartGame);
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = game.canvas.getBoundingClientRect();
    const scaleX = config.canvasWidth / rect.width;
    const scaleY = config.canvasHeight / rect.height;
    game.input.touchX = (touch.clientX - rect.left) * scaleX;
    game.input.touchY = (touch.clientY - rect.top) * scaleY;
}

function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = game.canvas.getBoundingClientRect();
        const scaleX = config.canvasWidth / rect.width;
        const scaleY = config.canvasHeight / rect.height;
        game.input.touchX = (touch.clientX - rect.left) * scaleX;
        game.input.touchY = (touch.clientY - rect.top) * scaleY;
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    game.input.touchX = null;
    game.input.touchY = null;
}

function handleMouseDown(e) {
    const rect = game.canvas.getBoundingClientRect();
    const scaleX = config.canvasWidth / rect.width;
    const scaleY = config.canvasHeight / rect.height;
    game.input.touchX = (e.clientX - rect.left) * scaleX;
    game.input.touchY = (e.clientY - rect.top) * scaleY;
}

function handleMouseMove(e) {
    if (e.buttons === 1) {
        const rect = game.canvas.getBoundingClientRect();
        const scaleX = config.canvasWidth / rect.width;
        const scaleY = config.canvasHeight / rect.height;
        game.input.touchX = (e.clientX - rect.left) * scaleX;
        game.input.touchY = (e.clientY - rect.top) * scaleY;
    }
}

function handleMouseUp() {
    game.input.touchX = null;
    game.input.touchY = null;
}

function createLevel() {
    // Create player
    game.player = new Player(50, 50);

    // Create prison walls (outer boundary)
    game.walls = [
        // Outer walls
        new Wall(0, 0, config.canvasWidth, 20),
        new Wall(0, 0, 20, config.canvasHeight),
        new Wall(config.canvasWidth - 20, 0, 20, config.canvasHeight),
        new Wall(0, config.canvasHeight - 20, config.canvasWidth, 20),
        
        // Interior walls - create prison cells
        new Wall(200, 100, 20, 150),
        new Wall(200, 100, 200, 20),
        new Wall(400, 100, 20, 150),
        
        new Wall(500, 200, 20, 200),
        new Wall(520, 200, 180, 20),
        new Wall(680, 220, 20, 180),
        
        new Wall(100, 350, 250, 20),
        new Wall(100, 350, 20, 150),
        
        new Wall(450, 450, 200, 20),
    ];

    // Create locked doors
    game.doors = [
        new Door(220, 250, 60, 20, false),  // First door
        new Door(500, 400, 20, 60, true),   // Second door
        new Door(350, 500, 60, 20, false),  // Exit door
    ];

    // Create keys in different locations
    game.keys = [
        new Key(300, 150),  // Key 1
        new Key(600, 350),  // Key 2
        new Key(150, 450),  // Key 3
    ];

    // Create enemies with patrol routes
    game.enemies = [
        new Enemy(300, 300, [
            { x: 300, y: 300 },
            { x: 450, y: 300 },
            { x: 450, y: 180 },
            { x: 300, y: 180 }
        ]),
        new Enemy(600, 450, [
            { x: 600, y: 450 },
            { x: 750, y: 450 },
            { x: 750, y: 300 },
            { x: 600, y: 300 }
        ]),
        new Enemy(150, 250, [
            { x: 150, y: 250 },
            { x: 150, y: 150 },
            { x: 80, y: 150 },
            { x: 80, y: 250 }
        ])
    ];
}

function updateKeyCount() {
    document.getElementById('key-count').textContent = game.keysCollected;
}

function gameLoop() {
    if (!game.running) return;

    // Clear canvas
    game.ctx.fillStyle = '#2a2a2a';
    game.ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Update
    game.player.update();
    game.enemies.forEach(enemy => enemy.update());
    game.keys.forEach(key => key.update());

    // Draw
    game.walls.forEach(wall => wall.draw());
    game.doors.forEach(door => door.draw());
    game.keys.forEach(key => key.draw());
    game.enemies.forEach(enemy => enemy.draw());
    game.player.draw();

    // Check win condition
    if (game.keysCollected === game.totalKeys) {
        const exitDoor = game.doors[game.doors.length - 1];
        if (exitDoor.open) {
            const dist = Math.hypot(game.player.x - (exitDoor.x + exitDoor.width / 2),
                                   game.player.y - (exitDoor.y + exitDoor.height / 2));
            if (dist < 50) {
                gameOver(true);
            }
        }
    }

    requestAnimationFrame(gameLoop);
}

function gameOver(won) {
    game.running = false;
    const gameOverDiv = document.getElementById('game-over');
    const gameOverText = document.getElementById('game-over-text');
    
    if (won) {
        gameOverText.textContent = 'You Escaped!';
        gameOverText.style.color = '#00ff00';
    } else {
        gameOverText.textContent = 'Caught! Game Over';
        gameOverText.style.color = '#ff4444';
    }
    
    gameOverDiv.classList.remove('hidden');
}

function restartGame() {
    // Hide game over screen
    document.getElementById('game-over').classList.add('hidden');
    
    // Reset game state
    game.keysCollected = 0;
    updateKeyCount();
    
    // Recreate level
    createLevel();
    
    // Restart game loop
    game.running = true;
    requestAnimationFrame(gameLoop);
}

// Start the game when page loads
window.addEventListener('load', init);
