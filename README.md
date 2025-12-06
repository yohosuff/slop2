# 2-Player Mobile Pong

A classic pong game designed for 2 players on a single mobile device. Each player controls their paddle from opposite ends of the phone.

## Features

- **Mobile-first design**: Optimized for touch screens
- **2-player gameplay**: One player on each end of the device
- **Touch controls**: Intuitive touch-based paddle movement
- **Responsive**: Works in both portrait and landscape orientations
- **PWA-ready**: Can be added to home screen for app-like experience
- **Smooth gameplay**: 60 FPS with requestAnimationFrame
- **Score tracking**: First to 7 points wins

## How to Play

1. Open the game on your mobile device
2. Hold the phone vertically (portrait mode recommended)
3. Player 1 touches the bottom half of the screen to control their paddle
4. Player 2 touches the top half of the screen to control their paddle
5. Tap "Start Game" to begin
6. Move your finger left/right to control your paddle
7. Score points by getting the ball past your opponent's paddle
8. First player to reach 7 points wins!

## Technology Stack

- Pure HTML5
- Vanilla JavaScript (ES6+)
- CSS3 with mobile-first responsive design
- No frameworks or external libraries

## File Structure

```
/
├── index.html          # Main HTML file
├── manifest.json       # PWA manifest
├── css/
│   └── style.css      # All styles
├── js/
│   └── game.js        # Game logic
└── assets/            # Icons and images (optional)
```

## Local Development

Simply open `index.html` in a web browser. For the best experience, use browser DevTools' mobile device emulation or test on an actual mobile device.

## PWA Installation

When accessed on a mobile device, browsers may prompt to "Add to Home Screen" for a full-screen app-like experience.
