# Prison Escape

A top-down stealth game where you must escape from prison by collecting keys and avoiding guards with vision cones.

## How to Play

1. **Objective**: Collect all 3 keys and reach the exit door to escape!
2. **Controls**:
   - **Desktop**: Use Arrow Keys or WASD to move
   - **Mobile**: Touch and hold to move toward that location
3. **Avoid**: Enemy guards with vision cones - if they see you, it's game over!
4. **Collect**: Golden keys to unlock red doors
5. **Escape**: Once all doors are open, reach the exit to win!

## Features

- 🎮 **Pure HTML5 Canvas Game** - No frameworks, just vanilla JavaScript
- 📱 **Mobile-First Design** - Optimized for touch controls and mobile screens
- 👁️ **Vision Cone Enemies** - Guards with realistic line-of-sight detection
- 🚶 **Patrol AI** - Enemies follow patrol routes
- 🔑 **Progressive Unlocking** - Doors open as you collect keys
- ⚡ **60 FPS Gameplay** - Smooth animations using requestAnimationFrame
- 🌐 **PWA Ready** - Can be installed as a web app

## Technical Details

- Pure vanilla JavaScript (ES6+)
- Mobile-first responsive CSS
- Touch + keyboard + mouse input support
- Collision detection system
- Vision cone mechanics with wall occlusion
- Zero dependencies
- Zero security vulnerabilities (CodeQL verified)

## Running the Game

Simply open `index.html` in a modern web browser, or serve it with any HTTP server:

```bash
python3 -m http.server 8080
```

Then navigate to `http://localhost:8080`

## Game Mechanics

- **Player**: Green circle - you control this character
- **Enemies**: Red circles with vision cones - avoid being seen!
- **Keys**: Golden rotating keys - collect all 3
- **Doors**: Red locked doors - open when you get keys
- **Walls**: Gray barriers - block movement and enemy vision

## Tips

- Study enemy patrol patterns before moving
- Use walls to block enemy line-of-sight
- Plan your route to collect keys efficiently
- Time your movements when enemies look away

Enjoy your escape! 🏃‍♂️
