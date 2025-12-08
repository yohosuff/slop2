/**
 * Navmesh Demo - Randomized 2D Level Geometry with Triangulation
 */

class NavmeshDemo {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Responsive canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // State
        this.showTriangles = true;
        this.showPolygons = true;
        this.polygonData = null;
        this.triangles = null;
        
        // Colors
        this.colors = {
            background: '#1a1a2e',
            boundary: '#00adb5',
            holes: '#ff6b6b',
            triangleStroke: '#ffd93d',
            triangleFill: 'rgba(255, 217, 61, 0.15)'
        };
        
        // Generate initial level
        this.generateLevel();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start render loop
        this.render();
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        if (this.polygonData) {
            this.render();
        }
    }
    
    generateLevel() {
        // Create a rectangular bounding box with some padding
        const padding = 50;
        const width = this.canvas.width - padding * 2;
        const height = this.canvas.height - padding * 2;
        
        // Outer boundary (counter-clockwise for earcut)
        const boundary = [
            padding, padding,
            padding + width, padding,
            padding + width, padding + height,
            padding, padding + height
        ];
        
        // Generate random holes (walls/buildings)
        const numHoles = Math.floor(Math.random() * 3) + 3; // 3-5 holes
        const holes = [];
        const holeIndices = [boundary.length / 2]; // First hole starts after boundary
        
        for (let i = 0; i < numHoles; i++) {
            const hole = this.generateRandomHole(padding, width, height);
            holes.push(...hole);
            if (i < numHoles - 1) {
                holeIndices.push((boundary.length + holes.length) / 2);
            }
        }
        
        // Combine boundary and holes
        const vertices = [...boundary, ...holes];
        
        // Store polygon data
        this.polygonData = {
            vertices,
            holeIndices,
            boundary,
            holes: this.splitHoles(holes, holeIndices, boundary.length / 2)
        };
        
        // Triangulate using earcut
        this.triangulate();
    }
    
    generateRandomHole(padding, maxWidth, maxHeight) {
        // Random position within the level
        const minSize = 40;
        const maxSize = 120;
        
        const holeWidth = Math.random() * (maxSize - minSize) + minSize;
        const holeHeight = Math.random() * (maxSize - minSize) + minSize;
        
        const x = padding + Math.random() * (maxWidth - holeWidth - 100) + 50;
        const y = padding + Math.random() * (maxHeight - holeHeight - 100) + 50;
        
        // Create rectangular hole (clockwise for earcut)
        return [
            x, y,
            x, y + holeHeight,
            x + holeWidth, y + holeHeight,
            x + holeWidth, y
        ];
    }
    
    splitHoles(holes, holeIndices, boundaryVertexCount) {
        const result = [];
        for (let i = 0; i < holeIndices.length; i++) {
            const startIdx = (holeIndices[i] - boundaryVertexCount) * 2;
            const endIdx = i < holeIndices.length - 1 
                ? (holeIndices[i + 1] - boundaryVertexCount) * 2 
                : holes.length;
            result.push(holes.slice(startIdx, endIdx));
        }
        return result;
    }
    
    triangulate() {
        if (!this.polygonData) return;
        
        try {
            // Use earcut to triangulate
            this.triangles = earcut(
                this.polygonData.vertices,
                this.polygonData.holeIndices,
                2 // 2D coordinates
            );
            console.log(`Generated ${this.triangles.length / 3} triangles`);
        } catch (error) {
            console.error('Triangulation error:', error);
            this.triangles = [];
        }
    }
    
    render() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.polygonData) return;
        
        // Draw triangles first (so they're behind polygons)
        if (this.showTriangles && this.triangles && this.triangles.length > 0) {
            this.drawTriangles();
        }
        
        // Draw polygons
        if (this.showPolygons) {
            this.drawPolygons();
        }
        
        // Draw UI info
        this.drawInfo();
    }
    
    drawTriangles() {
        const ctx = this.ctx;
        const vertices = this.polygonData.vertices;
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = this.colors.triangleStroke;
        ctx.fillStyle = this.colors.triangleFill;
        
        // Draw each triangle
        for (let i = 0; i < this.triangles.length; i += 3) {
            const idx1 = this.triangles[i] * 2;
            const idx2 = this.triangles[i + 1] * 2;
            const idx3 = this.triangles[i + 2] * 2;
            
            const x1 = vertices[idx1];
            const y1 = vertices[idx1 + 1];
            const x2 = vertices[idx2];
            const y2 = vertices[idx2 + 1];
            const x3 = vertices[idx3];
            const y3 = vertices[idx3 + 1];
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }
    
    drawPolygons() {
        const ctx = this.ctx;
        
        // Draw boundary
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.colors.boundary;
        ctx.beginPath();
        for (let i = 0; i < this.polygonData.boundary.length; i += 2) {
            const x = this.polygonData.boundary[i];
            const y = this.polygonData.boundary[i + 1];
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();
        
        // Draw holes (walls/buildings)
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.colors.holes;
        ctx.fillStyle = this.colors.background;
        
        for (const hole of this.polygonData.holes) {
            ctx.beginPath();
            for (let i = 0; i < hole.length; i += 2) {
                const x = hole[i];
                const y = hole[i + 1];
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }
    
    drawInfo() {
        const ctx = this.ctx;
        const padding = 10;
        const lineHeight = 20;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(padding, padding, 250, lineHeight * 5 + padding);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        
        let y = padding + lineHeight;
        ctx.fillText('Navmesh Demo', padding + 5, y);
        y += lineHeight;
        ctx.fillText(`Triangles: ${this.triangles ? this.triangles.length / 3 : 0}`, padding + 5, y);
        y += lineHeight;
        ctx.fillText(`Holes: ${this.polygonData.holes.length}`, padding + 5, y);
        y += lineHeight;
        ctx.fillText(`T: Toggle triangles (${this.showTriangles ? 'ON' : 'OFF'})`, padding + 5, y);
        y += lineHeight;
        ctx.fillText(`P: Toggle polygons (${this.showPolygons ? 'ON' : 'OFF'})`, padding + 5, y);
        y += lineHeight;
        ctx.fillText('R: Regenerate level', padding + 5, y);
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 't':
                    this.showTriangles = !this.showTriangles;
                    this.render();
                    break;
                case 'p':
                    this.showPolygons = !this.showPolygons;
                    this.render();
                    break;
                case 'r':
                    this.generateLevel();
                    this.render();
                    break;
            }
        });
        
        // Touch support for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            const deltaX = Math.abs(touch.clientX - touchStartX);
            const deltaY = Math.abs(touch.clientY - touchStartY);
            
            // If it's a tap (not a swipe)
            if (deltaX < 10 && deltaY < 10) {
                // Regenerate on tap
                this.generateLevel();
                this.render();
            }
        });
        
        // Click to regenerate
        this.canvas.addEventListener('click', () => {
            this.generateLevel();
            this.render();
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new NavmeshDemo();
});
