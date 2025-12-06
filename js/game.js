// Game configuration
const config = {
    paddleWidth: 0.15, // Relative to canvas width
    paddleHeight: 0.02, // Relative to canvas height
    paddleSpeed: 0.02, // Relative to canvas width per frame
    paddleOffset: 0.03, // Padding from edge (relative to canvas height)
    ballSize: 0.015, // Relative to canvas width
    ballSpeed: 0.008, // Initial speed relative to canvas width
    maxBallSpeed: 0.02,
    speedIncrease: 1.05,
    winScore: 7
};

// Game state
const game = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    running: false,
    animationId: null,
    
    // Paddles
    paddle1: { x: 0, y: 0, vx: 0 },
    paddle2: { x: 0, y: 0, vx: 0 },
    
    // Ball
    ball: { x: 0, y: 0, vx: 0, vy: 0, radius: 0 },
    
    // Scores
    score1: 0,
    score2: 0,
    
    // Touch tracking
    touches: {
        player1: null,
        player2: null
    }
};

// Initialize the game
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Setup event listeners
    setupControls();
    
    // Start button
    document.getElementById('startBtn').addEventListener('click', startGame);
}

// Resize canvas to fit screen
function resizeCanvas() {
    game.canvas.width = window.innerWidth;
    game.canvas.height = window.innerHeight;
    game.width = game.canvas.width;
    game.height = game.canvas.height;
    
    // Update game object sizes based on new dimensions
    if (game.running) {
        updateGameDimensions();
    }
}

// Update game dimensions when canvas resizes
function updateGameDimensions() {
    const paddleWidth = game.width * config.paddleWidth;
    const paddleHeight = game.height * config.paddleHeight;
    const paddleOffset = game.height * config.paddleOffset;
    
    game.ball.radius = game.width * config.ballSize;
    
    // Keep paddles within bounds (X-axis)
    game.paddle1.x = Math.max(paddleWidth / 2, Math.min(game.width - paddleWidth / 2, game.paddle1.x));
    game.paddle2.x = Math.max(paddleWidth / 2, Math.min(game.width - paddleWidth / 2, game.paddle2.x));
    
    // Update paddle Y positions to maintain offset from edges
    game.paddle1.y = game.height - paddleHeight - paddleOffset;
    game.paddle2.y = paddleOffset;
}

// Setup touch and mouse controls
function setupControls() {
    // Touch events
    game.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    game.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    game.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Mouse events as fallback
    game.canvas.addEventListener('mousedown', handleMouseDown);
    game.canvas.addEventListener('mousemove', handleMouseMove);
    game.canvas.addEventListener('mouseup', handleMouseUp);
}

// Handle touch start
function handleTouchStart(e) {
    e.preventDefault();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const y = touch.clientY;
        
        // Determine which player's area was touched
        if (y > game.height / 2) {
            // Player 1 (bottom)
            game.touches.player1 = {
                id: touch.identifier,
                x: touch.clientX
            };
        } else {
            // Player 2 (top)
            game.touches.player2 = {
                id: touch.identifier,
                x: touch.clientX
            };
        }
    }
}

// Handle touch move
function handleTouchMove(e) {
    e.preventDefault();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        
        // Update player 1 touch
        if (game.touches.player1 && touch.identifier === game.touches.player1.id) {
            game.touches.player1.x = touch.clientX;
        }
        
        // Update player 2 touch
        if (game.touches.player2 && touch.identifier === game.touches.player2.id) {
            game.touches.player2.x = touch.clientX;
        }
    }
}

// Handle touch end
function handleTouchEnd(e) {
    e.preventDefault();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        
        // Clear player 1 touch
        if (game.touches.player1 && touch.identifier === game.touches.player1.id) {
            game.touches.player1 = null;
        }
        
        // Clear player 2 touch
        if (game.touches.player2 && touch.identifier === game.touches.player2.id) {
            game.touches.player2 = null;
        }
    }
}

// Mouse event handlers (for testing on desktop)
let mouseDown = false;
let mouseY = 0;

function handleMouseDown(e) {
    mouseDown = true;
    mouseY = e.clientY;
}

function handleMouseMove(e) {
    if (mouseDown) {
        mouseY = e.clientY;
        
        // Simulate touch based on mouse position
        if (mouseY > game.height / 2) {
            game.touches.player1 = { id: -1, x: e.clientX };
        } else {
            game.touches.player2 = { id: -1, x: e.clientX };
        }
    }
}

function handleMouseUp(e) {
    mouseDown = false;
    const y = e.clientY;
    
    if (y > game.height / 2) {
        game.touches.player1 = null;
    } else {
        game.touches.player2 = null;
    }
}

// Start the game
function startGame() {
    // Hide start screen
    document.getElementById('start-screen').classList.add('hidden');
    
    // Reset scores
    game.score1 = 0;
    game.score2 = 0;
    updateScore();
    
    // Initialize game objects
    resetRound();
    
    // Start game loop
    game.running = true;
    gameLoop();
}

// Reset round (after a point is scored)
function resetRound() {
    const paddleWidth = game.width * config.paddleWidth;
    const paddleHeight = game.height * config.paddleHeight;
    const paddleOffset = game.height * config.paddleOffset;
    
    // Reset paddles
    game.paddle1.x = game.width / 2;
    game.paddle1.y = game.height - paddleHeight - paddleOffset;
    game.paddle1.vx = 0;
    
    game.paddle2.x = game.width / 2;
    game.paddle2.y = paddleOffset;
    game.paddle2.vx = 0;
    
    // Reset ball
    game.ball.x = game.width / 2;
    game.ball.y = game.height / 2;
    game.ball.radius = game.width * config.ballSize;
    
    // Random angle between -45 and 45 degrees (in radians)
    const angle = (Math.random() - 0.5) * Math.PI / 2;
    const speed = game.width * config.ballSpeed;
    
    // Randomly choose which player to serve to
    const direction = Math.random() < 0.5 ? 1 : -1;
    
    game.ball.vx = Math.sin(angle) * speed;
    game.ball.vy = Math.cos(angle) * speed * direction;
}

// Update game state
function update() {
    if (!game.running) return;
    
    const paddleWidth = game.width * config.paddleWidth;
    const paddleHeight = game.height * config.paddleHeight;
    const paddleSpeed = game.width * config.paddleSpeed;
    
    // Update paddle 1 (bottom) based on touch
    if (game.touches.player1) {
        const targetX = game.touches.player1.x;
        const diff = targetX - game.paddle1.x;
        
        if (Math.abs(diff) > 1) {
            game.paddle1.vx = Math.sign(diff) * paddleSpeed;
        } else {
            game.paddle1.vx = diff;
        }
    } else {
        game.paddle1.vx = 0;
    }
    
    game.paddle1.x += game.paddle1.vx;
    game.paddle1.x = Math.max(paddleWidth / 2, Math.min(game.width - paddleWidth / 2, game.paddle1.x));
    
    // Update paddle 2 (top) based on touch
    if (game.touches.player2) {
        const targetX = game.touches.player2.x;
        const diff = targetX - game.paddle2.x;
        
        if (Math.abs(diff) > 1) {
            game.paddle2.vx = Math.sign(diff) * paddleSpeed;
        } else {
            game.paddle2.vx = diff;
        }
    } else {
        game.paddle2.vx = 0;
    }
    
    game.paddle2.x += game.paddle2.vx;
    game.paddle2.x = Math.max(paddleWidth / 2, Math.min(game.width - paddleWidth / 2, game.paddle2.x));
    
    // Update ball position
    game.ball.x += game.ball.vx;
    game.ball.y += game.ball.vy;
    
    // Ball collision with walls
    if (game.ball.x - game.ball.radius <= 0 || game.ball.x + game.ball.radius >= game.width) {
        game.ball.vx *= -1;
        game.ball.x = Math.max(game.ball.radius, Math.min(game.width - game.ball.radius, game.ball.x));
    }
    
    // Helper function to increase ball speed after paddle hit
    const increaseBallSpeed = () => {
        const speed = Math.sqrt(game.ball.vx ** 2 + game.ball.vy ** 2);
        const maxSpeed = game.width * config.maxBallSpeed;
        if (speed < maxSpeed) {
            game.ball.vx *= config.speedIncrease;
            game.ball.vy *= config.speedIncrease;
        }
    };
    
    // Ball collision with paddle 1 (bottom)
    if (game.ball.vy > 0 && 
        game.ball.y + game.ball.radius >= game.paddle1.y &&
        game.ball.y - game.ball.radius <= game.paddle1.y + paddleHeight &&
        game.ball.x >= game.paddle1.x - paddleWidth / 2 &&
        game.ball.x <= game.paddle1.x + paddleWidth / 2) {
        
        game.ball.vy *= -1;
        game.ball.y = game.paddle1.y - game.ball.radius;
        
        // Add spin based on paddle movement and hit position
        const hitPos = (game.ball.x - game.paddle1.x) / (paddleWidth / 2);
        game.ball.vx += hitPos * game.width * config.ballSpeed * 0.5;
        game.ball.vx += game.paddle1.vx * 0.5;
        
        increaseBallSpeed();
    }
    
    // Ball collision with paddle 2 (top)
    if (game.ball.vy < 0 && 
        game.ball.y - game.ball.radius <= game.paddle2.y + paddleHeight &&
        game.ball.y + game.ball.radius >= game.paddle2.y &&
        game.ball.x >= game.paddle2.x - paddleWidth / 2 &&
        game.ball.x <= game.paddle2.x + paddleWidth / 2) {
        
        game.ball.vy *= -1;
        game.ball.y = game.paddle2.y + paddleHeight + game.ball.radius;
        
        // Add spin based on paddle movement and hit position
        const hitPos = (game.ball.x - game.paddle2.x) / (paddleWidth / 2);
        game.ball.vx += hitPos * game.width * config.ballSpeed * 0.5;
        game.ball.vx += game.paddle2.vx * 0.5;
        
        increaseBallSpeed();
    }
    
    // Check for scoring
    if (game.ball.y - game.ball.radius <= 0) {
        // Player 1 scores
        game.score1++;
        updateScore();
        checkWin(1);
        resetRound();
    } else if (game.ball.y + game.ball.radius >= game.height) {
        // Player 2 scores
        game.score2++;
        updateScore();
        checkWin(2);
        resetRound();
    }
}

// Render the game
function render() {
    const ctx = game.ctx;
    const paddleWidth = game.width * config.paddleWidth;
    const paddleHeight = game.height * config.paddleHeight;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, game.width, game.height);
    
    // Draw center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(0, game.height / 2);
    ctx.lineTo(game.width, game.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw paddles
    ctx.fillStyle = '#fff';
    
    // Paddle 1 (bottom)
    ctx.fillRect(
        game.paddle1.x - paddleWidth / 2,
        game.paddle1.y,
        paddleWidth,
        paddleHeight
    );
    
    // Paddle 2 (top)
    ctx.fillRect(
        game.paddle2.x - paddleWidth / 2,
        game.paddle2.y,
        paddleWidth,
        paddleHeight
    );
    
    // Draw ball
    ctx.beginPath();
    ctx.arc(game.ball.x, game.ball.y, game.ball.radius, 0, Math.PI * 2);
    ctx.fill();
}

// Update score display
function updateScore() {
    document.getElementById('score1').textContent = game.score1;
    document.getElementById('score2').textContent = game.score2;
}

// Check if someone won
function checkWin(player) {
    if (player === 1 && game.score1 >= config.winScore) {
        endGame('Player 1 Wins!');
    } else if (player === 2 && game.score2 >= config.winScore) {
        endGame('Player 2 Wins!');
    }
}

// End the game
function endGame(message) {
    game.running = false;
    
    // Show start screen with winner message
    const startScreen = document.getElementById('start-screen');
    startScreen.querySelector('h1').textContent = message;
    startScreen.classList.remove('hidden');
}

// Game loop
function gameLoop() {
    update();
    render();
    
    if (game.running) {
        game.animationId = requestAnimationFrame(gameLoop);
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
