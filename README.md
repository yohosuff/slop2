# Navmesh Triangulation Demo

A lightweight demo utility that uses [Earcut](https://github.com/mapbox/earcut) to create a navmesh of triangles for randomized 2D level geometry.

## Features

- **Randomized Level Generation**: Creates a large rectangular bounding polygon with holes representing walls and buildings
- **Earcut Triangulation**: Uses the Earcut library to efficiently triangulate polygons with holes
- **Visual Rendering**: Clearly displays both the triangulated mesh and the level geometry
- **Mobile-First Design**: Fully responsive and touch-enabled
- **PWA Ready**: Can be added to home screen on mobile devices

## How to Use

1. Open `index.html` in a web browser
2. The demo will automatically generate a random level with triangulated navmesh
3. **Click/Tap** anywhere to regenerate a new random level
4. **Press T** to toggle triangle visibility
5. **Press P** to toggle polygon visibility
6. **Press R** to regenerate the level

## Technology Stack

- Pure HTML5
- Vanilla JavaScript (ES6+)
- CSS3 (mobile-first, responsive)
- Earcut library for polygon triangulation

## Level Structure

- **Outer Boundary**: A large rectangle defining the playable area (blue outline)
- **Holes**: 3-5 randomly positioned rectangular obstacles representing walls/buildings (red outline)
- **Triangles**: The navmesh created by Earcut, showing navigable triangulated areas (yellow)

## Implementation Details

The demo uses Earcut's polygon triangulation algorithm to convert the level geometry (a polygon with holes) into a set of triangles. This navmesh can be used for:
- Pathfinding algorithms (A*, NavMesh navigation)
- AI agent movement
- Collision detection
- Line-of-sight calculations

The triangulation respects the holes in the polygon, creating a mesh that only covers walkable areas.
