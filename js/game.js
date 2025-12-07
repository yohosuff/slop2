// Game Configuration
const CONFIG = {
    CANVAS_PADDING: 20,
    UNIT_SIZE: 30,
    BASE_SIZE: 60,
    RESOURCE_SIZE: 25,
    WORKER_COST: 50,
    SOLDIER_COST: 75,
    MAX_UNITS: 10,
    WORKER_SPEED: 1.5,
    SOLDIER_SPEED: 2,
    COLLECTION_RATE: 2,
    ATTACK_DAMAGE: 5,
    ATTACK_RANGE: 40,
    ATTACK_COOLDOWN: 1000,
    AI_UPDATE_INTERVAL: 2000,
    INITIAL_RESOURCES: 100,
    WORKER_HP: 50,
    SOLDIER_HP: 100,
    BASE_HP: 500
};

// Game State
const game = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    running: false,
    paused: false,
    gameOver: false,
    lastTime: 0,
    player: {
        resources: CONFIG.INITIAL_RESOURCES,
        units: [],
        base: null
    },
    enemy: {
        resources: CONFIG.INITIAL_RESOURCES,
        units: [],
        base: null
    },
    resourceDeposits: [],
    selectedUnits: [],
    lastAIUpdate: 0
};

// Entity Classes
class Base {
    constructor(x, y, isPlayer) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.BASE_SIZE;
        this.isPlayer = isPlayer;
        this.hp = CONFIG.BASE_HP;
        this.maxHp = CONFIG.BASE_HP;
        this.lastDamageTime = 0;
    }

    takeDamage(damage) {
        this.hp = Math.max(0, this.hp - damage);
        this.lastDamageTime = Date.now();
        return this.hp <= 0;
    }

    draw(ctx) {
        const damageFlash = Date.now() - this.lastDamageTime < 200;
        
        // Base icon
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.isPlayer ? '🏠' : '🏰', this.x, this.y);

        // HP Bar
        const barWidth = this.size * 1.2;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size / 2 - 15;

        ctx.fillStyle = damageFlash ? '#ff0000' : '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        // Border
        ctx.strokeStyle = this.isPlayer ? '#3498db' : '#e74c3c';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    contains(x, y) {
        return Math.abs(x - this.x) < this.size / 2 && Math.abs(y - this.y) < this.size / 2;
    }
}

class Unit {
    constructor(x, y, type, isPlayer) {
        this.x = x;
        this.y = y;
        this.type = type; // 'worker' or 'soldier'
        this.isPlayer = isPlayer;
        this.size = CONFIG.UNIT_SIZE;
        this.targetX = x;
        this.targetY = y;
        this.speed = type === 'worker' ? CONFIG.WORKER_SPEED : CONFIG.SOLDIER_SPEED;
        this.hp = type === 'worker' ? CONFIG.WORKER_HP : CONFIG.SOLDIER_HP;
        this.maxHp = this.hp;
        this.isCollecting = false;
        this.targetDeposit = null;
        this.hasResource = false;
        this.targetEnemy = null;
        this.lastAttack = 0;
        this.lastDamageTime = 0;
    }

    update() {
        // Move towards target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 2) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }

        // Worker resource collection
        if (this.type === 'worker' && this.isCollecting && this.targetDeposit) {
            const depositDist = Math.sqrt(
                Math.pow(this.x - this.targetDeposit.x, 2) + 
                Math.pow(this.y - this.targetDeposit.y, 2)
            );
            
            const base = this.isPlayer ? game.player.base : game.enemy.base;
            const baseDist = Math.sqrt(
                Math.pow(this.x - base.x, 2) + 
                Math.pow(this.y - base.y, 2)
            );

            if (!this.hasResource && depositDist < 30) {
                this.hasResource = true;
                this.targetX = base.x;
                this.targetY = base.y;
            } else if (this.hasResource && baseDist < 50) {
                if (this.isPlayer) {
                    game.player.resources += CONFIG.COLLECTION_RATE;
                } else {
                    game.enemy.resources += CONFIG.COLLECTION_RATE;
                }
                this.hasResource = false;
                this.targetX = this.targetDeposit.x;
                this.targetY = this.targetDeposit.y;
            }
        }

        // Soldier combat
        if (this.type === 'soldier' && this.targetEnemy) {
            const enemyDist = Math.sqrt(
                Math.pow(this.x - this.targetEnemy.x, 2) + 
                Math.pow(this.y - this.targetEnemy.y, 2)
            );

            if (enemyDist < CONFIG.ATTACK_RANGE) {
                this.targetX = this.x;
                this.targetY = this.y;
                const now = Date.now();
                if (now - this.lastAttack > CONFIG.ATTACK_COOLDOWN) {
                    this.attack(this.targetEnemy);
                    this.lastAttack = now;
                }
            } else {
                this.targetX = this.targetEnemy.x;
                this.targetY = this.targetEnemy.y;
            }

            // Check if target is dead
            if (this.targetEnemy.hp <= 0) {
                this.targetEnemy = null;
            }
        }
    }

    attack(target) {
        target.takeDamage(CONFIG.ATTACK_DAMAGE);
    }

    takeDamage(damage) {
        this.hp = Math.max(0, this.hp - damage);
        this.lastDamageTime = Date.now();
    }

    draw(ctx, isSelected) {
        const damageFlash = Date.now() - this.lastDamageTime < 200;
        
        // Unit icon
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let icon = this.type === 'worker' ? '👷' : '⚔️';
        if (this.hasResource) icon = '💼';
        
        ctx.fillText(icon, this.x, this.y);

        // Selection circle
        if (isSelected) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2 + 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Team indicator
        ctx.fillStyle = this.isPlayer ? '#3498db' : '#e74c3c';
        ctx.beginPath();
        ctx.arc(this.x, this.y + this.size / 2 + 8, 3, 0, Math.PI * 2);
        ctx.fill();

        // HP Bar
        const barWidth = this.size;
        const barHeight = 4;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size / 2 - 10;

        ctx.fillStyle = damageFlash ? '#ff0000' : '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    }

    contains(x, y) {
        return Math.abs(x - this.x) < this.size / 2 && Math.abs(y - this.y) < this.size / 2;
    }
}

class ResourceDeposit {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.RESOURCE_SIZE;
    }

    draw(ctx) {
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💎', this.x, this.y);
    }
}

// Initialize Game
function init() {
    game.canvas = document.getElementById('game-canvas');
    game.ctx = game.canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize game objects
    setupGame();

    // Event Listeners
    setupEventListeners();

    // Start game loop
    game.running = true;
    game.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    const header = document.getElementById('game-header');
    const controlPanel = document.getElementById('control-panel');
    
    game.canvas.width = container.clientWidth;
    game.canvas.height = container.clientHeight - header.clientHeight - controlPanel.clientHeight;
    game.width = game.canvas.width;
    game.height = game.canvas.height;
}

function setupGame() {
    // Clear existing
    game.player.units = [];
    game.enemy.units = [];
    game.resourceDeposits = [];
    game.selectedUnits = [];
    game.player.resources = CONFIG.INITIAL_RESOURCES;
    game.enemy.resources = CONFIG.INITIAL_RESOURCES;
    game.gameOver = false;
    game.paused = false;

    // Create bases
    game.player.base = new Base(
        CONFIG.BASE_SIZE,
        game.height - CONFIG.BASE_SIZE,
        true
    );
    game.enemy.base = new Base(
        game.width - CONFIG.BASE_SIZE,
        CONFIG.BASE_SIZE,
        false
    );

    // Create resource deposits
    const numDeposits = 5;
    for (let i = 0; i < numDeposits; i++) {
        const x = CONFIG.CANVAS_PADDING + Math.random() * (game.width - CONFIG.CANVAS_PADDING * 2);
        const y = CONFIG.CANVAS_PADDING + Math.random() * (game.height - CONFIG.CANVAS_PADDING * 2);
        game.resourceDeposits.push(new ResourceDeposit(x, y));
    }

    updateUI();
}

function setupEventListeners() {
    // Touch and Mouse Events for Canvas
    game.canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    game.canvas.addEventListener('mousedown', handlePointerDown);
    game.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // Control Buttons
    document.getElementById('btn-create-worker').addEventListener('click', () => createUnit('worker'));
    document.getElementById('btn-create-soldier').addEventListener('click', () => createUnit('soldier'));
    document.getElementById('btn-pause').addEventListener('click', togglePause);
    document.getElementById('btn-restart').addEventListener('click', restart);
    document.getElementById('btn-play-again').addEventListener('click', restart);
    document.getElementById('btn-close-instructions').addEventListener('click', () => {
        document.getElementById('instructions').classList.add('hidden');
    });
}

function handlePointerDown(e) {
    e.preventDefault();
    
    const rect = game.canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.type === 'touchstart') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Check if clicking on a unit
    let clickedUnit = null;
    for (let unit of game.player.units) {
        if (unit.contains(x, y)) {
            clickedUnit = unit;
            break;
        }
    }

    if (clickedUnit) {
        // Select unit
        if (!e.shiftKey && e.type !== 'touchstart') {
            game.selectedUnits = [clickedUnit];
        } else {
            const index = game.selectedUnits.indexOf(clickedUnit);
            if (index === -1) {
                game.selectedUnits.push(clickedUnit);
            } else {
                game.selectedUnits.splice(index, 1);
            }
        }
    } else if (game.selectedUnits.length > 0) {
        // Move selected units
        for (let unit of game.selectedUnits) {
            unit.targetX = x;
            unit.targetY = y;
            unit.isCollecting = false;
            unit.targetDeposit = null;
            
            // Check if clicking on resource deposit
            for (let deposit of game.resourceDeposits) {
                const dist = Math.sqrt(Math.pow(x - deposit.x, 2) + Math.pow(y - deposit.y, 2));
                if (dist < 30 && unit.type === 'worker') {
                    unit.isCollecting = true;
                    unit.targetDeposit = deposit;
                    unit.targetX = deposit.x;
                    unit.targetY = deposit.y;
                }
            }
        }
    } else {
        // Clear selection
        game.selectedUnits = [];
    }
}

function createUnit(type) {
    const cost = type === 'worker' ? CONFIG.WORKER_COST : CONFIG.SOLDIER_COST;
    
    if (game.player.resources < cost) {
        showStatus('Not enough resources!', 'warning');
        return;
    }
    
    if (game.player.units.length >= CONFIG.MAX_UNITS) {
        showStatus('Maximum units reached!', 'warning');
        return;
    }

    game.player.resources -= cost;
    
    const spawnX = game.player.base.x + 50;
    const spawnY = game.player.base.y - 50;
    
    const unit = new Unit(spawnX, spawnY, type, true);
    game.player.units.push(unit);
    
    updateUI();
    showStatus(`${type === 'worker' ? 'Worker' : 'Soldier'} created!`, 'success');
}

function updateAI() {
    // Simple AI: Create units and attack
    if (game.enemy.resources >= CONFIG.SOLDIER_COST && game.enemy.units.length < CONFIG.MAX_UNITS) {
        const spawnX = game.enemy.base.x - 50;
        const spawnY = game.enemy.base.y + 50;
        
        const type = Math.random() > 0.3 ? 'soldier' : 'worker';
        const unit = new Unit(spawnX, spawnY, type, false);
        game.enemy.units.push(unit);
        game.enemy.resources -= type === 'worker' ? CONFIG.WORKER_COST : CONFIG.SOLDIER_COST;
    }

    // AI unit behavior
    for (let unit of game.enemy.units) {
        if (unit.type === 'worker') {
            if (!unit.isCollecting && game.resourceDeposits.length > 0) {
                const deposit = game.resourceDeposits[Math.floor(Math.random() * game.resourceDeposits.length)];
                unit.isCollecting = true;
                unit.targetDeposit = deposit;
                unit.targetX = deposit.x;
                unit.targetY = deposit.y;
            }
        } else if (unit.type === 'soldier') {
            // Attack player units or base
            if (!unit.targetEnemy || unit.targetEnemy.hp <= 0) {
                if (game.player.units.length > 0) {
                    unit.targetEnemy = game.player.units[Math.floor(Math.random() * game.player.units.length)];
                } else {
                    unit.targetEnemy = game.player.base;
                }
            }
        }
    }
}

function gameLoop(currentTime) {
    if (!game.running) return;

    const deltaTime = currentTime - game.lastTime;
    game.lastTime = currentTime;

    if (!game.paused && !game.gameOver) {
        // Update AI
        if (currentTime - game.lastAIUpdate > CONFIG.AI_UPDATE_INTERVAL) {
            updateAI();
            game.lastAIUpdate = currentTime;
        }

        // Update all units
        [...game.player.units, ...game.enemy.units].forEach(unit => unit.update());

        // Remove dead units
        game.player.units = game.player.units.filter(unit => unit.hp > 0);
        game.enemy.units = game.enemy.units.filter(unit => unit.hp > 0);
        
        // Remove dead units from selection
        game.selectedUnits = game.selectedUnits.filter(unit => unit.hp > 0);

        // Check win/loss conditions
        if (game.enemy.base.hp <= 0) {
            endGame(true);
        } else if (game.player.base.hp <= 0) {
            endGame(false);
        }

        updateUI();
    }

    render();
    requestAnimationFrame(gameLoop);
}

function render() {
    const ctx = game.ctx;
    
    // Clear canvas
    ctx.fillStyle = '#2a4a3a';
    ctx.fillRect(0, 0, game.width, game.height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < game.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, game.height);
        ctx.stroke();
    }
    for (let i = 0; i < game.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(game.width, i);
        ctx.stroke();
    }

    // Draw resource deposits
    game.resourceDeposits.forEach(deposit => deposit.draw(ctx));

    // Draw bases
    game.player.base.draw(ctx);
    game.enemy.base.draw(ctx);

    // Draw units
    game.enemy.units.forEach(unit => unit.draw(ctx, false));
    game.player.units.forEach(unit => unit.draw(ctx, game.selectedUnits.includes(unit)));

    // Draw selection indicator
    if (game.selectedUnits.length > 0) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        game.selectedUnits.forEach(unit => {
            ctx.beginPath();
            ctx.arc(unit.x, unit.y, unit.size / 2 + 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    }

    // Draw pause overlay
    if (game.paused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, game.width, game.height);
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', game.width / 2, game.height / 2);
    }
}

function updateUI() {
    document.getElementById('player-resources').textContent = Math.floor(game.player.resources);
    document.getElementById('player-units').textContent = game.player.units.length;
    document.getElementById('max-units').textContent = CONFIG.MAX_UNITS;

    // Update button states
    document.getElementById('btn-create-worker').disabled = 
        game.player.resources < CONFIG.WORKER_COST || game.player.units.length >= CONFIG.MAX_UNITS;
    document.getElementById('btn-create-soldier').disabled = 
        game.player.resources < CONFIG.SOLDIER_COST || game.player.units.length >= CONFIG.MAX_UNITS;
}

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('game-status-text');
    statusEl.textContent = message;
    setTimeout(() => {
        statusEl.textContent = 'Collect resources and destroy enemy base!';
    }, 2000);
}

function togglePause() {
    game.paused = !game.paused;
    document.getElementById('btn-pause').innerHTML = game.paused 
        ? '<span class="btn-icon">▶️</span><span class="btn-label">Resume</span>'
        : '<span class="btn-icon">⏸️</span><span class="btn-label">Pause</span>';
}

function restart() {
    document.getElementById('game-over').classList.add('hidden');
    setupGame();
}

function endGame(playerWon) {
    game.gameOver = true;
    const title = document.getElementById('game-over-title');
    const message = document.getElementById('game-over-message');
    
    if (playerWon) {
        title.textContent = 'Victory! 🎉';
        title.style.color = '#2ecc71';
        message.textContent = 'You have destroyed the enemy base!';
    } else {
        title.textContent = 'Defeat 😞';
        title.style.color = '#e74c3c';
        message.textContent = 'Your base has been destroyed!';
    }
    
    document.getElementById('game-over').classList.remove('hidden');
}

// Start the game when page loads
window.addEventListener('load', init);
