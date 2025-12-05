/**
 * Survive - A Strategy Survival Game
 * Pure HTML5/CSS3/JavaScript mobile-first game
 */

// Game State
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAMEOVER: 'gameover'
};

// Game Configuration
const CONFIG = {
    TILE_SIZE: 40,
    DAY_DURATION: 30000, // 30 seconds per day cycle
    NIGHT_DURATION: 20000, // 20 seconds per night
    BASE_ENEMY_SPAWN_RATE: 3000, // ms between enemy spawns at night
    RESOURCE_RESPAWN_TIME: 15000, // 15 seconds
    TURRET_RANGE: 150,
    TURRET_DAMAGE: 25,
    TURRET_FIRE_RATE: 1000, // ms
    ENEMY_SPEED: 1.5,
    ENEMY_DAMAGE: 10,
    ENEMY_HEALTH: 50,
    PLAYER_MAX_HEALTH: 100,
    FARM_FOOD_RATE: 5000, // Food produced every 5 seconds
    FOOD_HEAL_AMOUNT: 5
};

// Game Class
class Game {
    constructor() {
        this.state = GameState.MENU;
        this.canvas = null;
        this.ctx = null;
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Resources
        this.resources = {
            wood: 0,
            stone: 0,
            food: 0
        };
        
        // Game stats
        this.day = 1;
        this.isNight = false;
        this.dayTimer = 0;
        this.health = CONFIG.PLAYER_MAX_HEALTH;
        
        // Game objects
        this.base = null;
        this.resourceNodes = [];
        this.buildings = [];
        this.enemies = [];
        this.projectiles = [];
        this.floatingTexts = [];
        
        // Input state
        this.selectedBuilding = null;
        this.touchStart = null;
        
        // Timers
        this.enemySpawnTimer = 0;
        this.farmTimer = 0;
        this.healTimer = 0;
        
        this.init();
    }
    
    init() {
        // Get DOM elements
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Setup canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.gameLoop(0);
    }
    
    resizeCanvas() {
        const container = document.getElementById('game-screen');
        const hud = document.getElementById('hud');
        const buildMenu = document.getElementById('build-menu');
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Calculate playable area
        this.playableArea = {
            x: 0,
            y: hud ? hud.offsetHeight : 50,
            width: this.canvas.width,
            height: this.canvas.height - (hud ? hud.offsetHeight : 50) - (buildMenu ? buildMenu.offsetHeight : 60)
        };
    }
    
    setupEventListeners() {
        // Start button
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        
        // Build buttons
        document.querySelectorAll('.build-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectBuilding(e.currentTarget));
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.selectBuilding(e.currentTarget);
            });
        });
        
        // Canvas touch/mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e));
        this.canvas.addEventListener('touchstart', (e) => this.handleInputStart(e), { passive: false });
        this.canvas.addEventListener('mouseup', (e) => this.handleInputEnd(e));
        this.canvas.addEventListener('touchend', (e) => this.handleInputEnd(e), { passive: false });
        
        // Prevent default touch behaviors
        document.body.addEventListener('touchmove', (e) => {
            if (this.state === GameState.PLAYING) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    handleInputStart(e) {
        if (this.state !== GameState.PLAYING) return;
        
        e.preventDefault();
        const pos = this.getInputPosition(e);
        this.touchStart = pos;
    }
    
    handleInputEnd(e) {
        if (this.state !== GameState.PLAYING) return;
        
        e.preventDefault();
        const pos = this.getInputPosition(e);
        
        if (!this.touchStart) return;
        
        // Check if it's a tap (not a drag)
        const dx = pos.x - this.touchStart.x;
        const dy = pos.y - this.touchStart.y;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
            this.handleTap(pos);
        }
        
        this.touchStart = null;
    }
    
    getInputPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            return {
                x: e.changedTouches[0].clientX - rect.left,
                y: e.changedTouches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    handleTap(pos) {
        // Check if tapping a resource node
        for (let i = this.resourceNodes.length - 1; i >= 0; i--) {
            const node = this.resourceNodes[i];
            if (node.available && this.isPointInCircle(pos, node, 30)) {
                this.collectResource(node);
                return;
            }
        }
        
        // Check if placing a building
        if (this.selectedBuilding) {
            this.placeBuilding(pos);
            return;
        }
    }
    
    isPointInCircle(point, circle, radius) {
        const dx = point.x - circle.x;
        const dy = point.y - circle.y;
        return dx * dx + dy * dy <= radius * radius;
    }
    
    selectBuilding(btn) {
        const buildingType = btn.dataset.building;
        const costWood = parseInt(btn.dataset.costWood) || 0;
        const costStone = parseInt(btn.dataset.costStone) || 0;
        
        // Check if can afford
        if (this.resources.wood >= costWood && this.resources.stone >= costStone) {
            // Toggle selection
            if (this.selectedBuilding === buildingType) {
                this.selectedBuilding = null;
                document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('selected'));
            } else {
                this.selectedBuilding = buildingType;
                document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            }
        }
    }
    
    placeBuilding(pos) {
        if (!this.selectedBuilding) return;
        
        // Get building costs
        const costs = {
            wall: { wood: 10, stone: 5 },
            turret: { wood: 20, stone: 15 },
            farm: { wood: 15, stone: 0 }
        };
        
        const cost = costs[this.selectedBuilding];
        if (this.resources.wood < cost.wood || this.resources.stone < cost.stone) return;
        
        // Check if position is valid (not overlapping base or other buildings)
        const minDistance = 40;
        if (this.isPointInCircle(pos, this.base, 50)) return;
        
        for (const building of this.buildings) {
            if (this.isPointInCircle(pos, building, minDistance)) return;
        }
        
        // Deduct resources
        this.resources.wood -= cost.wood;
        this.resources.stone -= cost.stone;
        
        // Create building
        const building = {
            type: this.selectedBuilding,
            x: pos.x,
            y: pos.y,
            health: this.selectedBuilding === 'wall' ? 100 : 75,
            maxHealth: this.selectedBuilding === 'wall' ? 100 : 75,
            lastFireTime: 0
        };
        
        this.buildings.push(building);
        this.addFloatingText(pos.x, pos.y, '✓ Built!', '#4a9eff');
        
        // Clear selection
        this.selectedBuilding = null;
        document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('selected'));
        
        this.updateUI();
    }
    
    collectResource(node) {
        const amounts = {
            wood: 5,
            stone: 3,
            food: 4
        };
        
        const amount = amounts[node.type];
        this.resources[node.type] += amount;
        node.available = false;
        
        // Schedule respawn
        setTimeout(() => {
            node.available = true;
        }, CONFIG.RESOURCE_RESPAWN_TIME);
        
        // Visual feedback
        const icons = { wood: '🪵', stone: '🪨', food: '🍖' };
        this.addFloatingText(node.x, node.y, `+${amount} ${icons[node.type]}`, '#4ade80');
        
        this.updateUI();
    }
    
    addFloatingText(x, y, text, color) {
        this.floatingTexts.push({
            x, y, text, color,
            opacity: 1,
            offsetY: 0
        });
    }
    
    startGame() {
        // Reset game state
        this.resources = { wood: 20, stone: 10, food: 10 };
        this.day = 1;
        this.isNight = false;
        this.dayTimer = CONFIG.DAY_DURATION;
        this.health = CONFIG.PLAYER_MAX_HEALTH;
        this.buildings = [];
        this.enemies = [];
        this.projectiles = [];
        this.floatingTexts = [];
        this.selectedBuilding = null;
        this.enemySpawnTimer = 0;
        this.farmTimer = 0;
        this.healTimer = 0;
        
        // Setup base in center
        this.base = {
            x: this.canvas.width / 2,
            y: this.playableArea.y + this.playableArea.height / 2
        };
        
        // Generate resource nodes
        this.generateResourceNodes();
        
        // Switch screens
        this.showScreen('game-screen');
        this.state = GameState.PLAYING;
        
        this.updateUI();
    }
    
    generateResourceNodes() {
        this.resourceNodes = [];
        
        const types = ['wood', 'wood', 'wood', 'stone', 'stone', 'food', 'food'];
        const minDistance = 80;
        
        for (const type of types) {
            let attempts = 0;
            while (attempts < 50) {
                const x = this.playableArea.x + 50 + Math.random() * (this.playableArea.width - 100);
                const y = this.playableArea.y + 50 + Math.random() * (this.playableArea.height - 100);
                
                // Check distance from base
                const dxBase = x - this.base.x;
                const dyBase = y - this.base.y;
                const distFromBase = Math.sqrt(dxBase * dxBase + dyBase * dyBase);
                
                if (distFromBase > 100) {
                    // Check distance from other nodes
                    let valid = true;
                    for (const node of this.resourceNodes) {
                        const dx = x - node.x;
                        const dy = y - node.y;
                        if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
                            valid = false;
                            break;
                        }
                    }
                    
                    if (valid) {
                        this.resourceNodes.push({
                            type,
                            x,
                            y,
                            available: true
                        });
                        break;
                    }
                }
                attempts++;
            }
        }
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }
    
    gameLoop(timestamp) {
        this.deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        if (this.state === GameState.PLAYING) {
            this.update(this.deltaTime);
            this.render();
        }
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    update(dt) {
        // Update day/night cycle
        this.dayTimer -= dt;
        if (this.dayTimer <= 0) {
            if (this.isNight) {
                // Transition to day
                this.isNight = false;
                this.day++;
                this.dayTimer = CONFIG.DAY_DURATION;
                this.addFloatingText(this.base.x, this.base.y - 50, `☀️ Day ${this.day}`, '#ffd700');
            } else {
                // Transition to night
                this.isNight = true;
                this.dayTimer = CONFIG.NIGHT_DURATION;
                this.addFloatingText(this.base.x, this.base.y - 50, '🌙 Night Falls!', '#6366f1');
            }
            this.updateUI();
        }
        
        // Spawn enemies at night
        if (this.isNight) {
            this.enemySpawnTimer -= dt;
            if (this.enemySpawnTimer <= 0) {
                this.spawnEnemy();
                // Spawn faster as days progress
                const spawnRate = Math.max(1000, CONFIG.BASE_ENEMY_SPAWN_RATE - (this.day - 1) * 200);
                this.enemySpawnTimer = spawnRate;
            }
        }
        
        // Update enemies
        this.updateEnemies(dt);
        
        // Update turrets
        this.updateTurrets(dt);
        
        // Update projectiles
        this.updateProjectiles(dt);
        
        // Update farms
        this.updateFarms(dt);
        
        // Heal with food
        this.healTimer -= dt;
        if (this.healTimer <= 0 && this.health < CONFIG.PLAYER_MAX_HEALTH && this.resources.food > 0) {
            this.resources.food--;
            this.health = Math.min(CONFIG.PLAYER_MAX_HEALTH, this.health + CONFIG.FOOD_HEAL_AMOUNT);
            this.healTimer = 2000;
            this.updateUI();
        }
        
        // Update floating texts
        this.updateFloatingTexts(dt);
        
        // Check game over
        if (this.health <= 0) {
            this.gameOver();
        }
    }
    
    spawnEnemy() {
        // Spawn from edge of screen
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch (side) {
            case 0: // Top
                x = Math.random() * this.canvas.width;
                y = this.playableArea.y - 20;
                break;
            case 1: // Right
                x = this.canvas.width + 20;
                y = this.playableArea.y + Math.random() * this.playableArea.height;
                break;
            case 2: // Bottom
                x = Math.random() * this.canvas.width;
                y = this.playableArea.y + this.playableArea.height + 20;
                break;
            case 3: // Left
                x = -20;
                y = this.playableArea.y + Math.random() * this.playableArea.height;
                break;
        }
        
        // Scale enemy health with days
        const healthMultiplier = 1 + (this.day - 1) * 0.2;
        
        this.enemies.push({
            x,
            y,
            health: CONFIG.ENEMY_HEALTH * healthMultiplier,
            maxHealth: CONFIG.ENEMY_HEALTH * healthMultiplier,
            speed: CONFIG.ENEMY_SPEED,
            lastAttackTime: 0
        });
    }
    
    updateEnemies(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Find target (closest building or base)
            let target = this.base;
            let minDist = this.getDistance(enemy, this.base);
            
            for (const building of this.buildings) {
                const dist = this.getDistance(enemy, building);
                if (dist < minDist) {
                    minDist = dist;
                    target = building;
                }
            }
            
            // Move towards target
            if (minDist > 30) {
                const dx = target.x - enemy.x;
                const dy = target.y - enemy.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                enemy.x += (dx / len) * enemy.speed * (dt / 16);
                enemy.y += (dy / len) * enemy.speed * (dt / 16);
            } else {
                // Attack target
                if (Date.now() - enemy.lastAttackTime > 1000) {
                    enemy.lastAttackTime = Date.now();
                    
                    if (target === this.base) {
                        this.health -= CONFIG.ENEMY_DAMAGE;
                        this.addFloatingText(this.base.x, this.base.y, `-${CONFIG.ENEMY_DAMAGE}`, '#ff4444');
                    } else {
                        target.health -= CONFIG.ENEMY_DAMAGE;
                        if (target.health <= 0) {
                            const idx = this.buildings.indexOf(target);
                            if (idx > -1) {
                                this.buildings.splice(idx, 1);
                                this.addFloatingText(target.x, target.y, '💥', '#ff4444');
                            }
                        }
                    }
                    this.updateUI();
                }
            }
            
            // Remove dead enemies
            if (enemy.health <= 0) {
                this.enemies.splice(i, 1);
                // Drop resources
                if (Math.random() > 0.5) {
                    const type = Math.random() > 0.5 ? 'wood' : 'stone';
                    this.resources[type] += 2;
                    const icons = { wood: '🪵', stone: '🪨' };
                    this.addFloatingText(enemy.x, enemy.y, `+2 ${icons[type]}`, '#4ade80');
                    this.updateUI();
                }
            }
        }
    }
    
    updateTurrets(dt) {
        const now = Date.now();
        
        for (const building of this.buildings) {
            if (building.type !== 'turret') continue;
            
            // Find nearest enemy in range
            let nearestEnemy = null;
            let nearestDist = CONFIG.TURRET_RANGE;
            
            for (const enemy of this.enemies) {
                const dist = this.getDistance(building, enemy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestEnemy = enemy;
                }
            }
            
            // Fire at enemy
            if (nearestEnemy && now - building.lastFireTime > CONFIG.TURRET_FIRE_RATE) {
                building.lastFireTime = now;
                
                // Create projectile
                const dx = nearestEnemy.x - building.x;
                const dy = nearestEnemy.y - building.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                
                this.projectiles.push({
                    x: building.x,
                    y: building.y,
                    vx: (dx / len) * 8,
                    vy: (dy / len) * 8,
                    damage: CONFIG.TURRET_DAMAGE
                });
            }
        }
    }
    
    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            proj.x += proj.vx * (dt / 16);
            proj.y += proj.vy * (dt / 16);
            
            // Check collision with enemies
            for (const enemy of this.enemies) {
                if (this.getDistance(proj, enemy) < 20) {
                    enemy.health -= proj.damage;
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
            
            // Remove if off screen
            if (proj.x < 0 || proj.x > this.canvas.width || 
                proj.y < 0 || proj.y > this.canvas.height) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    updateFarms(dt) {
        this.farmTimer -= dt;
        if (this.farmTimer <= 0) {
            this.farmTimer = CONFIG.FARM_FOOD_RATE;
            
            // Count farms and produce food
            let farmCount = 0;
            for (const building of this.buildings) {
                if (building.type === 'farm') {
                    farmCount++;
                }
            }
            
            if (farmCount > 0) {
                this.resources.food += farmCount;
                this.updateUI();
            }
        }
    }
    
    updateFloatingTexts(dt) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const text = this.floatingTexts[i];
            text.offsetY -= 0.5 * (dt / 16);
            text.opacity -= 0.02 * (dt / 16);
            
            if (text.opacity <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }
    
    getDistance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = this.isNight ? '#1a3a1a' : '#2d5a27';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid pattern
        this.ctx.strokeStyle = this.isNight ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += CONFIG.TILE_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.playableArea.y);
            this.ctx.lineTo(x, this.playableArea.y + this.playableArea.height);
            this.ctx.stroke();
        }
        for (let y = this.playableArea.y; y < this.playableArea.y + this.playableArea.height; y += CONFIG.TILE_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Draw resource nodes
        for (const node of this.resourceNodes) {
            if (node.available) {
                const icons = { wood: '🌲', stone: '🪨', food: '🍖' };
                this.ctx.font = '28px serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(icons[node.type], node.x, node.y);
                
                // Highlight circle
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, 25, 0, Math.PI * 2);
                this.ctx.stroke();
            } else {
                // Show respawning indicator
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Draw buildings
        for (const building of this.buildings) {
            const icons = { wall: '🧱', turret: '🗼', farm: '🌾' };
            this.ctx.font = '32px serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(icons[building.type], building.x, building.y);
            
            // Health bar
            if (building.health < building.maxHealth) {
                const barWidth = 30;
                const barHeight = 4;
                const healthPercent = building.health / building.maxHealth;
                
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(building.x - barWidth / 2, building.y - 25, barWidth, barHeight);
                this.ctx.fillStyle = healthPercent > 0.5 ? '#4ade80' : (healthPercent > 0.25 ? '#fbbf24' : '#ef4444');
                this.ctx.fillRect(building.x - barWidth / 2, building.y - 25, barWidth * healthPercent, barHeight);
            }
            
            // Turret range indicator when selected
            if (building.type === 'turret' && this.selectedBuilding === 'turret') {
                this.ctx.strokeStyle = 'rgba(74, 158, 255, 0.2)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(building.x, building.y, CONFIG.TURRET_RANGE, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
        
        // Draw base
        this.ctx.font = '48px serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🏰', this.base.x, this.base.y);
        
        // Draw enemies
        for (const enemy of this.enemies) {
            this.ctx.font = '28px serif';
            this.ctx.fillText('👹', enemy.x, enemy.y);
            
            // Health bar
            const barWidth = 24;
            const barHeight = 3;
            const healthPercent = enemy.health / enemy.maxHealth;
            
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(enemy.x - barWidth / 2, enemy.y - 22, barWidth, barHeight);
            this.ctx.fillStyle = '#ef4444';
            this.ctx.fillRect(enemy.x - barWidth / 2, enemy.y - 22, barWidth * healthPercent, barHeight);
        }
        
        // Draw projectiles
        this.ctx.fillStyle = '#ffd700';
        for (const proj of this.projectiles) {
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw building placement preview
        if (this.selectedBuilding && this.touchStart) {
            const icons = { wall: '🧱', turret: '🗼', farm: '🌾' };
            this.ctx.globalAlpha = 0.5;
            this.ctx.font = '32px serif';
            this.ctx.fillText(icons[this.selectedBuilding], this.touchStart.x, this.touchStart.y);
            this.ctx.globalAlpha = 1;
        }
        
        // Draw floating texts
        for (const text of this.floatingTexts) {
            this.ctx.globalAlpha = text.opacity;
            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.fillStyle = text.color;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(text.text, text.x, text.y + text.offsetY);
        }
        this.ctx.globalAlpha = 1;
        
        // Night overlay
        if (this.isNight) {
            this.ctx.fillStyle = 'rgba(0, 0, 50, 0.3)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    updateUI() {
        document.getElementById('wood-count').textContent = `🪵 ${this.resources.wood}`;
        document.getElementById('stone-count').textContent = `🪨 ${this.resources.stone}`;
        document.getElementById('food-count').textContent = `🍖 ${this.resources.food}`;
        document.getElementById('day-counter').textContent = `Day ${this.day}`;
        document.getElementById('time-indicator').textContent = this.isNight ? '🌙 Night' : '☀️ Day';
        document.getElementById('time-indicator').style.background = this.isNight ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 200, 0, 0.3)';
        
        // Update health bar
        const healthPercent = (this.health / CONFIG.PLAYER_MAX_HEALTH) * 100;
        document.getElementById('health-fill').style.width = `${healthPercent}%`;
        document.getElementById('health-text').textContent = `❤️ ${Math.max(0, Math.round(this.health))}`;
        
        // Update build button states
        document.querySelectorAll('.build-btn').forEach(btn => {
            const costWood = parseInt(btn.dataset.costWood) || 0;
            const costStone = parseInt(btn.dataset.costStone) || 0;
            
            if (this.resources.wood >= costWood && this.resources.stone >= costStone) {
                btn.classList.remove('disabled');
            } else {
                btn.classList.add('disabled');
                if (btn.classList.contains('selected')) {
                    btn.classList.remove('selected');
                    this.selectedBuilding = null;
                }
            }
        });
    }
    
    gameOver() {
        this.state = GameState.GAMEOVER;
        document.getElementById('final-score').textContent = `You survived ${this.day} day${this.day !== 1 ? 's' : ''}!`;
        this.showScreen('gameover-screen');
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Game();
});
