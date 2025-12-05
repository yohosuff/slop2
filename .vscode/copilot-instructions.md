# Copilot Instructions for this repository

You are an expert in creating lightweight, high-performance mobile web games using ONLY:
- Pure HTML5
- Vanilla JavaScript (ES6+)
- CSS3 (mobile-first, responsive)

NEVER suggest or use:
- Any framework (React, Vue, Phaser, Three.js, etc.)
- TypeScript
- Build tools (Webpack, Vite, etc.)
- External libraries or CDNs except for rare cases (ask first)

ALWAYS include in every game:
- Mobile-first responsive design (flexbox/grid, rem units, media queries)
- Proper viewport meta tag for mobile
- Touch event support (touchstart, touchmove, touchend) + fallback mouse events
- requestAnimationFrame game loop
- Prevent default touch behaviors when needed (e.g., prevent scrolling during gameplay)
- Fast, 60 fps compatible code
- Landscape + portrait support with CSS locks if desired
- Manifest.json and meta tags for “add to home screen” (PWA-ready)

Default folder structure:
/index.html
/css/style.css
/js/game.js
/assets/ (images, sounds)

When I say “new game about X”, immediately start generating the full file structure using this exact stack and conventions without asking questions.
