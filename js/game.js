// Navmesh Demo - Randomized 2D Level Geometry with Earcut Triangulation
'use strict';

class NavmeshDemo {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // State
        this.levelPolygon = [];
        this.navmeshTriangles = [];
        this.animationFrameId = null;
        
        // Rendering options
        this.showLevel = true;
        this.showNavmesh = true;
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Generate initial level
        this.generateRandomLevel();
        
        // Setup touch and mouse events
        this.setupEvents();
        
        // Start render loop
        this.render();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Regenerate level on resize
        if (this.levelPolygon.length > 0) {
            this.generateRandomLevel();
        }
    }
    
    setupEvents() {
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.generateRandomLevel();
        }, { passive: false });
        
        // Mouse events (fallback)
        this.canvas.addEventListener('click', () => {
            this.generateRandomLevel();
        });
        
        // Prevent scrolling on canvas
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }
    
    generateRandomLevel() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const minRadius = Math.min(this.canvas.width, this.canvas.height) * 0.2;
        const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.4;
        
        // Generate random polygon with 5-12 vertices
        const numVertices = 5 + Math.floor(Math.random() * 8);
        const vertices = [];
        
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const radius = minRadius + Math.random() * (maxRadius - minRadius);
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            vertices.push(x, y);
        }
        
        this.levelPolygon = vertices;
        
        // Triangulate using earcut
        this.triangulateLevel();
    }
    
    triangulateLevel() {
        if (this.levelPolygon.length < 6) {
            console.warn('Not enough vertices to triangulate');
            return;
        }
        
        try {
            // Earcut expects a flat array of coordinates [x1, y1, x2, y2, ...]
            // and returns triangle indices [i1, i2, i3, i4, i5, i6, ...]
            const indices = earcut(this.levelPolygon);
            
            // Convert indices to actual triangle coordinates
            this.navmeshTriangles = [];
            for (let i = 0; i < indices.length; i += 3) {
                const idx1 = indices[i] * 2;
                const idx2 = indices[i + 1] * 2;
                const idx3 = indices[i + 2] * 2;
                
                this.navmeshTriangles.push({
                    p1: { x: this.levelPolygon[idx1], y: this.levelPolygon[idx1 + 1] },
                    p2: { x: this.levelPolygon[idx2], y: this.levelPolygon[idx2 + 1] },
                    p3: { x: this.levelPolygon[idx3], y: this.levelPolygon[idx3 + 1] }
                });
            }
        } catch (error) {
            console.error('Triangulation failed:', error);
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render navmesh triangles
        if (this.showNavmesh && this.navmeshTriangles.length > 0) {
            this.renderNavmesh();
        }
        
        // Render level geometry outline
        if (this.showLevel && this.levelPolygon.length > 0) {
            this.renderLevelGeometry();
        }
        
        // Render UI
        this.renderUI();
        
        // Continue loop
        this.animationFrameId = requestAnimationFrame(() => this.render());
    }
    
    cleanup() {
        // Cancel animation frame if needed
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    renderNavmesh() {
        this.navmeshTriangles.forEach((triangle, index) => {
            // Alternate colors for better visibility
            const hue = (index * 30) % 360;
            
            // Fill triangle with semi-transparent color
            this.ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.3)`;
            this.ctx.beginPath();
            this.ctx.moveTo(triangle.p1.x, triangle.p1.y);
            this.ctx.lineTo(triangle.p2.x, triangle.p2.y);
            this.ctx.lineTo(triangle.p3.x, triangle.p3.y);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Draw triangle edges
            this.ctx.strokeStyle = `hsla(${hue}, 70%, 50%, 0.8)`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw triangle centers for better visualization
            const centerX = (triangle.p1.x + triangle.p2.x + triangle.p3.x) / 3;
            const centerY = (triangle.p1.y + triangle.p2.y + triangle.p3.y) / 3;
            
            this.ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.6)`;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    renderLevelGeometry() {
        // Draw level polygon outline
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        
        for (let i = 0; i < this.levelPolygon.length; i += 2) {
            const x = this.levelPolygon[i];
            const y = this.levelPolygon[i + 1];
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Draw vertices
        this.ctx.fillStyle = '#00ff88';
        for (let i = 0; i < this.levelPolygon.length; i += 2) {
            const x = this.levelPolygon[i];
            const y = this.levelPolygon[i + 1];
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 6, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    renderUI() {
        // Draw instructions
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        
        const padding = 20;
        let y = padding + 20;
        
        this.ctx.fillText('Navmesh Demo - Earcut Triangulation', padding, y);
        y += 30;
        
        this.ctx.fillStyle = '#00ff88';
        this.ctx.fillText('Green: Level Geometry', padding, y);
        y += 25;
        
        this.ctx.fillStyle = '#ff88aa';
        this.ctx.fillText('Colors: Navmesh Triangles', padding, y);
        y += 25;
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`Triangles: ${this.navmeshTriangles.length}`, padding, y);
        y += 25;
        
        this.ctx.fillText('Tap/Click to generate new level', padding, y);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new NavmeshDemo();
});
