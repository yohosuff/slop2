const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
let wave = 1;
let lastTime = 0;
let animationId = null;

// Canvas setup
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Player
const player = {
    x: 0,
    y: 0,
    width: 40,
    height: 50,
    speed: 5,
    health: 100,
    maxHealth: 100,
    shootCooldown: 0,
    shootDelay: 200, // ms
    isDragging: false,
    init() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 100;
        this.health = this.maxHealth;
    },
    draw() {
        // Ship body
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height / 4);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Engine glow
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(this.x, this.y + this.height / 2, 8, 0, Math.PI * 2);
        ctx.fill();
    },
    update(deltaTime) {
        // Keep in bounds
        this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(canvas.height - this.height / 2, this.y));
        
        // Auto-shoot
        this.shootCooldown -= deltaTime;
        if (this.shootCooldown <= 0) {
            this.shoot();
            this.shootCooldown = this.shootDelay;
        }
    },
    shoot() {
        bullets.push({
            x: this.x,
            y: this.y - this.height / 2,
            width: 4,
            height: 15,
            speed: 10,
            damage: 20
        });
    },
    takeDamage(amount) {
        this.health -= amount;
        updateHealth();
        if (this.health <= 0) {
            endGame();
        }
    }
};

// Bullets
const bullets = [];
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.y -= bullet.speed;
        
        // Remove off-screen bullets
        if (bullet.y < -bullet.height) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Draw bullet
        ctx.fillStyle = '#ffff00';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffff00';
        ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
        ctx.shadowBlur = 0;
    }
}

// Enemies
const enemies = [];
let enemySpawnTimer = 0;
let enemySpawnDelay = 1000;

function spawnEnemy() {
    const types = [
        { width: 40, height: 40, speed: 2, health: 20, color: '#ff0000', points: 10 },
        { width: 50, height: 50, speed: 1.5, health: 40, color: '#ff00ff', points: 20 },
        { width: 60, height: 30, speed: 3, health: 15, color: '#ff6600', points: 15 }
    ];
    
    const type = types[Math.floor(Math.random() * types.length)];
    
    enemies.push({
        x: Math.random() * (canvas.width - type.width) + type.width / 2,
        y: -type.height,
        ...type,
        maxHealth: type.health
    });
}

function updateEnemies(deltaTime) {
    enemySpawnTimer += deltaTime;
    
    if (enemySpawnTimer >= enemySpawnDelay) {
        spawnEnemy();
        enemySpawnTimer = 0;
    }
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.y += enemy.speed;
        
        // Remove off-screen enemies
        if (enemy.y > canvas.height + enemy.height) {
            enemies.splice(i, 1);
            continue;
        }
        
        // Check collision with bullets
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            if (checkCollision(bullet, enemy)) {
                bullets.splice(j, 1);
                enemy.health -= bullet.damage;
                
                if (enemy.health <= 0) {
                    // Create explosion
                    createExplosion(enemy.x, enemy.y, enemy.color);
                    score += enemy.points;
                    updateScore();
                    enemies.splice(i, 1);
                }
                break;
            }
        }
        
        // Check collision with player
        if (enemy.health > 0 && checkCollision(player, enemy)) {
            createExplosion(enemy.x, enemy.y, enemy.color);
            player.takeDamage(20);
            enemies.splice(i, 1);
            continue;
        }
        
        // Draw enemy
        if (enemy.health > 0) {
            ctx.fillStyle = enemy.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Health bar
            const healthPercent = enemy.health / enemy.maxHealth;
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2 - 10, enemy.width * healthPercent, 3);
            ctx.shadowBlur = 0;
        }
    }
}

// Particles/Explosions
const particles = [];

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            color
        });
    }
}

function updateParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= deltaTime / 500;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Collision detection
function checkCollision(obj1, obj2) {
    return Math.abs(obj1.x - obj2.x) < (obj1.width + obj2.width) / 2 &&
           Math.abs(obj1.y - obj2.y) < (obj1.height + obj2.height) / 2;
}

// Background stars
const stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: Math.random() * 2 + 1
    });
}

function updateStars() {
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
}

// Wave system
function checkWaveProgress() {
    if (score >= wave * 100) {
        wave++;
        updateWave();
        enemySpawnDelay = Math.max(300, enemySpawnDelay - 100);
    }
}

// UI Updates
function updateScore() {
    document.getElementById('score').textContent = score;
    checkWaveProgress();
}

function updateHealth() {
    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('health-fill').style.width = healthPercent + '%';
}

function updateWave() {
    document.getElementById('wave').textContent = wave;
}

// Touch/Mouse controls
let touchId = null;

function handleStart(e) {
    e.preventDefault();
    if (gameState !== 'playing') return;
    
    const touch = e.touches ? e.touches[0] : e;
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    if (Math.abs(x - player.x) < player.width && Math.abs(y - player.y) < player.height) {
        player.isDragging = true;
        touchId = e.touches ? e.touches[0].identifier : 'mouse';
    }
}

function handleMove(e) {
    e.preventDefault();
    if (gameState !== 'playing' || !player.isDragging) return;
    
    const touch = e.touches ? e.touches[0] : e;
    const rect = canvas.getBoundingClientRect();
    player.x = touch.clientX - rect.left;
    player.y = touch.clientY - rect.top;
}

function handleEnd(e) {
    e.preventDefault();
    player.isDragging = false;
    touchId = null;
}

canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd, { passive: false });
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);

// Game loop
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'playing') {
        updateStars();
        player.update(deltaTime);
        player.draw();
        updateBullets();
        updateEnemies(deltaTime);
        updateParticles(deltaTime);
    }
    
    animationId = requestAnimationFrame(gameLoop);
}

// Game state management
function startGame() {
    gameState = 'playing';
    score = 0;
    wave = 1;
    enemies.length = 0;
    bullets.length = 0;
    particles.length = 0;
    enemySpawnTimer = 0;
    enemySpawnDelay = 1000;
    
    player.init();
    updateScore();
    updateHealth();
    updateWave();
    
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
}

function endGame() {
    gameState = 'gameOver';
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-wave').textContent = wave;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

// Button events
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

// Initialize
player.init();
gameLoop(0);
