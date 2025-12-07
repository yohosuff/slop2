// Game state
const game = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    running: false,
    paused: false,
    timer: 99,
    lastTime: 0,
    keys: {},
    touchButtons: new Set()
};

// Player class
class Fighter {
    constructor(x, y, color, controls, facingRight = true) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 100;
        this.color = color;
        this.facingRight = facingRight;
        
        // Movement
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 300;
        this.jumpPower = -600;
        this.gravity = 1800;
        this.onGround = false;
        
        // Combat
        this.health = 100;
        this.maxHealth = 100;
        this.attacking = false;
        this.attackCooldown = 0;
        this.attackType = '';
        this.blocking = false;
        this.hitStun = 0;
        
        // Controls
        this.controls = controls;
        
        // Animation
        this.animationFrame = 0;
        this.animationTimer = 0;
    }
    
    update(deltaTime, opponent) {
        // Hitstun
        if (this.hitStun > 0) {
            this.hitStun -= deltaTime;
            return;
        }
        
        // Attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
            if (this.attackCooldown <= 0) {
                this.attacking = false;
                this.attackType = '';
            }
        }
        
        // Movement input
        let moveX = 0;
        if (!this.attacking && !this.blocking) {
            if (this.isActionActive('left')) {
                moveX = -1;
                this.facingRight = false;
            }
            if (this.isActionActive('right')) {
                moveX = 1;
                this.facingRight = true;
            }
        }
        
        this.velocityX = moveX * this.speed;
        
        // Jump
        if (this.isActionActive('jump') && this.onGround && !this.attacking) {
            this.velocityY = this.jumpPower;
            this.onGround = false;
        }
        
        // Blocking
        this.blocking = this.isActionActive('block') && this.onGround;
        
        // Attacks
        if (!this.attacking && this.attackCooldown <= 0 && this.onGround) {
            if (this.isActionActive('punch')) {
                this.attack('punch');
            } else if (this.isActionActive('kick')) {
                this.attack('kick');
            }
        }
        
        // Physics
        this.velocityY += this.gravity * deltaTime;
        
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        // Ground collision
        const groundY = game.height - 150 - this.height;
        if (this.y >= groundY) {
            this.y = groundY;
            this.velocityY = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }
        
        // Screen boundaries
        if (this.x < 0) this.x = 0;
        if (this.x > game.width - this.width) this.x = game.width - this.width;
        
        // Check attack collision
        if (this.attacking) {
            this.checkAttackHit(opponent);
        }
        
        // Update animation
        this.animationTimer += deltaTime;
        if (this.animationTimer > 0.1) {
            this.animationFrame = (this.animationFrame + 1) % 4;
            this.animationTimer = 0;
        }
    }
    
    isActionActive(action) {
        const key = this.controls[action];
        const touchKey = `${this.controls.player}_${action}`;
        return game.keys[key] || game.touchButtons.has(touchKey);
    }
    
    attack(type) {
        this.attacking = true;
        this.attackType = type;
        this.attackCooldown = type === 'punch' ? 0.3 : 0.5;
        this.velocityX = 0;
    }
    
    checkAttackHit(opponent) {
        const attackRange = this.attackType === 'kick' ? 80 : 60;
        const attackX = this.facingRight ? this.x + this.width : this.x - attackRange;
        
        // Check if opponent is in range
        const hitboxOverlap = attackX < opponent.x + opponent.width && 
                             attackX + attackRange > opponent.x &&
                             this.y < opponent.y + opponent.height &&
                             this.y + this.height > opponent.y;
        
        if (hitboxOverlap && this.attackCooldown > 0.2) {
            const damage = this.attackType === 'kick' ? 15 : 10;
            const actualDamage = opponent.blocking ? damage * 0.3 : damage;
            
            opponent.health -= actualDamage;
            opponent.health = Math.max(0, opponent.health);
            opponent.hitStun = 0.2;
            
            // Knockback
            const knockbackForce = opponent.blocking ? 100 : 200;
            opponent.velocityX = (this.facingRight ? 1 : -1) * knockbackForce;
            
            if (!opponent.blocking) {
                opponent.velocityY = -150;
            }
            
            // Prevent multiple hits from same attack
            this.attackCooldown = 0.15;
        }
    }
    
    draw() {
        const ctx = game.ctx;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, game.height - 150, this.width / 2, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Body
        ctx.fillStyle = this.color;
        
        if (this.hitStun > 0) {
            ctx.fillStyle = '#ffffff';
        }
        
        // Main body
        ctx.fillRect(this.x + 15, this.y + 20, 30, 60);
        
        // Head
        ctx.beginPath();
        ctx.arc(this.x + 30, this.y + 15, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Legs
        const legOffset = Math.sin(this.animationFrame * Math.PI / 2) * 5;
        ctx.fillRect(this.x + 18, this.y + 80, 10, 20 + legOffset);
        ctx.fillRect(this.x + 32, this.y + 80, 10, 20 - legOffset);
        
        // Arms
        if (this.attacking && this.attackType === 'punch') {
            const punchExtend = this.facingRight ? 20 : -20;
            ctx.fillRect(
                this.facingRight ? this.x + 45 : this.x - 5,
                this.y + 30,
                20 + Math.abs(punchExtend),
                10
            );
        } else if (this.attacking && this.attackType === 'kick') {
            const kickExtend = this.facingRight ? 25 : -25;
            ctx.fillRect(
                this.facingRight ? this.x + 45 : this.x - 10,
                this.y + 60,
                25 + Math.abs(kickExtend),
                12
            );
        } else {
            // Normal arms
            ctx.fillRect(this.facingRight ? this.x + 45 : this.x, this.y + 30, 15, 10);
            ctx.fillRect(this.facingRight ? this.x : this.x + 45, this.y + 40, 15, 10);
        }
        
        // Blocking indicator
        if (this.blocking) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - 5, this.y - 5, this.width + 10, this.height + 10);
        }
        
        // Attack effect
        if (this.attacking && this.attackCooldown > 0.2) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            const effectX = this.facingRight ? this.x + this.width : this.x - 30;
            ctx.beginPath();
            ctx.arc(effectX, this.y + this.height / 2, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Initialize game
function init() {
    game.canvas = document.getElementById('game-canvas');
    game.ctx = game.canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize players
    game.player1 = new Fighter(
        100,
        game.height - 250,
        '#4ecca3',
        {
            player: '1',
            left: 'a',
            right: 'd',
            jump: 'w',
            punch: 'q',
            kick: 'e',
            block: 's'
        },
        true
    );
    
    game.player2 = new Fighter(
        game.width - 160,
        game.height - 250,
        '#ff6b6b',
        {
            player: '2',
            left: 'ArrowLeft',
            right: 'ArrowRight',
            jump: 'ArrowUp',
            punch: 'o',
            kick: 'p',
            block: 'ArrowDown'
        },
        false
    );
    
    setupControls();
    
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
}

function resizeCanvas() {
    game.canvas.width = game.canvas.offsetWidth;
    game.canvas.height = game.canvas.offsetHeight;
    game.width = game.canvas.width;
    game.height = game.canvas.height;
}

function setupControls() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        game.keys[e.key.toLowerCase()] = true;
        e.preventDefault();
    });
    
    window.addEventListener('keyup', (e) => {
        game.keys[e.key.toLowerCase()] = false;
        e.preventDefault();
    });
    
    // Touch controls
    const buttons = document.querySelectorAll('.control-btn');
    buttons.forEach(btn => {
        const player = btn.dataset.player;
        const action = btn.dataset.action;
        const touchKey = `${player}_${action}`;
        
        // Touch events
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            game.touchButtons.add(touchKey);
        });
        
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            game.touchButtons.delete(touchKey);
        });
        
        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            game.touchButtons.delete(touchKey);
        });
        
        // Mouse events (fallback)
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            game.touchButtons.add(touchKey);
        });
        
        btn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            game.touchButtons.delete(touchKey);
        });
        
        btn.addEventListener('mouseleave', (e) => {
            game.touchButtons.delete(touchKey);
        });
    });
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    game.running = true;
    game.timer = 99;
    game.lastTime = performance.now();
    
    // Reset players
    game.player1.health = 100;
    game.player2.health = 100;
    game.player1.x = 100;
    game.player2.x = game.width - 160;
    game.player1.y = game.height - 250;
    game.player2.y = game.height - 250;
    
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    document.getElementById('game-over').classList.add('hidden');
    startGame();
}

function gameLoop(currentTime) {
    if (!game.running) return;
    
    const deltaTime = Math.min((currentTime - game.lastTime) / 1000, 0.1);
    game.lastTime = currentTime;
    
    // Update
    update(deltaTime);
    
    // Draw
    draw();
    
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // Update timer
    game.timer -= deltaTime;
    if (game.timer < 0) game.timer = 0;
    document.getElementById('timer').textContent = Math.ceil(game.timer);
    
    // Update players
    game.player1.update(deltaTime, game.player2);
    game.player2.update(deltaTime, game.player1);
    
    // Update health bars
    document.getElementById('player1-health').style.width = game.player1.health + '%';
    document.getElementById('player2-health').style.width = game.player2.health + '%';
    
    // Check win conditions
    if (game.player1.health <= 0 || game.player2.health <= 0 || game.timer <= 0) {
        endGame();
    }
}

function draw() {
    const ctx = game.ctx;
    
    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, game.height);
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(0.5, '#34495e');
    gradient.addColorStop(1, '#7f8c8d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, game.width, game.height);
    
    // Ground
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, game.height - 150, game.width, 150);
    
    // Ground line
    ctx.strokeStyle = '#1a252f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, game.height - 150);
    ctx.lineTo(game.width, game.height - 150);
    ctx.stroke();
    
    // Grid pattern on ground
    ctx.strokeStyle = 'rgba(26, 37, 47, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < game.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, game.height - 150);
        ctx.lineTo(i, game.height);
        ctx.stroke();
    }
    
    // Draw players
    game.player1.draw();
    game.player2.draw();
}

function endGame() {
    game.running = false;
    
    let winner;
    if (game.timer <= 0) {
        winner = game.player1.health > game.player2.health ? 'PLAYER 1' : 
                 game.player1.health < game.player2.health ? 'PLAYER 2' : 'DRAW';
    } else {
        winner = game.player1.health > 0 ? 'PLAYER 1' : 'PLAYER 2';
    }
    
    document.getElementById('winner-text').textContent = winner === 'DRAW' ? 'DRAW!' : winner + ' WINS!';
    document.getElementById('game-over').classList.remove('hidden');
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
