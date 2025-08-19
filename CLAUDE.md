# Alto's Odyssey Style Snowboarding Game - Technical Reference

## Game Summary
An endless runner snowboarding game inspired by Alto's Odyssey, featuring realistic momentum-based physics, exciting procedural terrain generation, and mobile-optimized portrait gameplay. Built with Phaser.js, TypeScript, and Matter.js physics with major performance and gameplay improvements.

## Recent Major Updates (Latest Version)
- **Enhanced Speed System**: Balanced high-speed gameplay with excellent uphill momentum retention
- **New Terrain Types**: 6 exciting terrain varieties including epic downhills and dramatic hills
- **Optimized Backgrounds**: Performance-optimized parallax mountains with detailed trees
- **Improved Physics**: Better acceleration, friction, and hill climbing mechanics
- **Visual Enhancements**: Color-coded terrain types and atmospheric mountain backgrounds

## Core Systems Architecture

### 1. Player Character (`src/objects/Motorcycle.ts`)
**High-Speed Snowboarder with Enhanced Physics**

- **Visual Design**: Sausage character sprite (`SausageSkiLeanin.png`) with flipping animation (`Flipping.png`)
- **Physics Engine**: Matter.js integration with custom momentum system
- **Enhanced Movement System**:
  - Base speed: 400px/s on flat ground (increased from 300px/s)
  - Maximum speed: 2800px/s (increased from 600px/s)
  - Minimum speed: 350px/s (increased from 100px/s)
  - Downhill acceleration: Up to 8x multiplier with slope bonuses
  - Excellent uphill speed retention with hill climb power

**Key Physics Features**:
```typescript
// Enhanced momentum-based speed calculation
const slopeInfluence = Math.sin(terrainAngle) * this.slopeInfluence // 1.2 influence
// Downhill: accelerationMultiplier = 5 + (slopeInfluence * 3)
// Uphill: Uses hill climb power (4.0) × torque (2.8) for excellent retention
```

**Enhanced Speed System**:
- **Hill Climb Power**: 4.0 (dramatically improved from 3.0)
- **Torque Multiplier**: 2.8 (increased from 2.0)
- **Downhill Bonuses**: Up to 400 extra speed on steep downhills
- **Speed Limits**: Up to 3300px/s on epic downhills (reasonable but exciting)

**Jump System**:
- **Ground Detection**: 3-tier system for different scenarios
  - `isOnGround`: Basic physics flag
  - `canJumpFromGround()`: Forgiving jump detection (30-120px threshold)
  - `isTrulyAirborne()`: Strict airborne check (15px clearance)
- **Enhanced Jump Power**: 1000 (increased from 350)
- **Momentum Launches**: Speed converts to jump power on upward ramps
- **Hill Top Bonuses**: Extra jump power and forgiveness on downward slopes

**Spin System**:
- Continuous 360°/second rotation while input held
- Auto-correction at 360°/second when upside down
- Only functions when truly airborne (15px clearance)

### 2. Terrain Generation (`src/systems/LevelGenerator.ts`)
**Exciting Infinite Procedural World Generation**

**Chunk System**:
- 300px wide seamless terrain segments
- 3x screen width view distance generation
- Automatic cleanup of chunks behind camera
- Extended terrain features spanning multiple chunks

**New Exciting Terrain Types** (with spawn rates):
```typescript
if (terrainType < 0.35) createEpicDownhill()    // 35% - Epic 4-8 chunk downhills (400-1000px deep)
else if (terrainType < 0.55) createSteepUphill() // 20% - Challenging 3-6 chunk uphills (250-550px up)
else if (terrainType < 0.68) createMiniSlopes()  // 13% - Quick 1-2 chunk elevation changes (±100px)
else if (terrainType < 0.8) createDramaticHills() // 12% - 3-5 chunk dramatic rolling terrain
else if (terrainType < 0.92) createMassiveJump() // 12% - 2-3 chunk massive jump ramps (220-400px buildup)
else if (terrainType < 0.97) createSpeedValley() // 5% - 2-4 chunk deep speed valleys (200-500px deep)
else createExtendedFlat()                        // 3% - 1 chunk flat sections (minimal)
```

**Terrain Features**:
- **Epic Downhills**: Very long speed-building sections with accelerating curves
- **Steep Uphills**: Challenging climbs that test momentum retention
- **Mini Slopes**: Quick elevation changes with multiple small bumps
- **Dramatic Hills**: Complex multi-wave terrain with large elevation changes
- **Massive Jumps**: Big ramps with perfect launch angles for huge air
- **Speed Valleys**: Deep dips designed for maximum momentum building

**Color-Coded Visual System**:
- **Orange**: Epic downhills (speed focus)
- **Red**: Steep uphills (challenge focus)  
- **Light Green**: Mini slopes (rhythm focus)
- **Purple**: Dramatic hills (variety focus)
- **Cyan**: Massive jumps (air focus)
- **Yellow**: Speed valleys (momentum focus)

**Seamless Connection System**:
- Tracks `lastChunkEndHeight` and `lastChunkEndAngle` 
- Each new chunk starts exactly where previous ended
- Path smoothing algorithm prevents sharp terrain angles

**Visual Styling**:
- Snow white base terrain (`0xF8F8FF`)
- Varied outline colors: Powder blue, steel blue, cornflower blue
- Physics bodies perfectly aligned with visual terrain

### 3. Input Management (`src/systems/InputManager.ts`)
**Unified Touch and Keyboard Controls**

- **Mobile**: Touch events with pointer tracking
- **Desktop**: Spacebar, WASD, arrow keys
- **Input Processing**:
  - First press while on ground → Jump
  - Hold while airborne → Continuous spinning
  - Release while airborne → Auto-correction if upside down

### 4. Scoring System (`src/systems/ScoreManager.ts`)
**Comprehensive Trick and Combo System**

**Scoring Breakdown**:
- **360° Spins**: 500 points each
- **Air Time**: 100 points per second
- **Big Air**: 300 bonus (2+ seconds)
- **Massive Air**: 500 bonus (3+ seconds)
- **Combo Multiplier**: `1 + (airTime/2) + (trickCount * 0.5)`

**UI Elements** (Camera-relative with `setScrollFactor(0)`):
- Score and token display (top-left)
- Spin counter (top-right)
- Control hints (bottom)
- Trick combo popups (center screen)

### 5. Game Scene (`src/scenes/GameScene.ts`)
**Main Game Orchestration with Optimized Backgrounds**

**Performance-Optimized Parallax Mountain Background**:
- **3-layer mountain system** with detailed trees and atmospheric depth
- **Subtle parallax scrolling**: Very low scroll factors (0.1, 0.15, 0.2) for stable, atmospheric feel
- **Tree-covered mountains**: Procedurally placed trees on mountain slopes with size scaling
- **Smart tree placement**: Trees only appear on gentle slopes, not steep cliffs
- **Mountain heights**: 200px, 300px, 450px base heights (all below player terrain level)
- **Color variety**: Dark blue to light blue-gray for atmospheric perspective
- **Winter blue sky gradient**: `0x4169E1` to `0x87CEEB` for depth

**Background Performance Optimizations**:
- **Eliminated pixel-by-pixel rendering**: Replaced with smooth curve generation
- **Reduced geometry**: 20-25 points per mountain vs thousands of pixels
- **Efficient tree rendering**: Simple triangle shapes instead of complex sprites
- **Strategic layer reduction**: 3 detailed layers vs previous 5 basic layers

**Camera System**:
- Follows player with offset `(-100, -150)` for optimal viewing
- Portrait orientation optimized for mobile
- Smooth follow interpolation

## Technical Configuration

### Enhanced Game Settings (`src/config/GameSettings.ts`)
```typescript
canvas: {
  width: 400,   // Portrait mobile optimization
  height: 800,  // 1:2 aspect ratio
}

motorcycle: {
  maxSpeed: 2800,        // Increased from 1800 for exciting gameplay
  acceleration: 3500,    // Increased from 2500 for responsive feel
  minSpeed: 350,         // Increased from 200 for better flow
  hillClimbPower: 4.0,   // Increased from 2.5 for uphill momentum retention
  torqueMultiplier: 2.8, // Increased from 1.8 for better uphill performance
  jumpPower: 1000,       // Increased from 900 for better air
  mass: 0.6,            // Reduced from 0.8 for lighter, faster movement
}

physics: {
  gravity: 900,           // Reduced from 1000 for floatier feel
  groundFriction: 0.992,  // Increased from 0.985 for better speed retention
  airFriction: 0.999,     // Increased from 0.998 for less air resistance
  slopeFriction: 0.98,    // Increased from 0.95 for better uphill momentum
}

level: {
  groundY: 720,      // Adjusted for portrait space
  chunkWidth: 300,   // Optimized for mobile
}
```

### Enhanced Physics Configuration
- **Matter.js** engine with custom gravity (900)
- **Improved Speed Retention**: Much less friction on all surfaces
- **Better Uphill Performance**: Hill climb power × torque multiplier system
- **Balanced Acceleration**: Fast response without being uncontrollable
- **Collision Detection**: Terrain physics bodies match visuals exactly
- **Performance**: Efficient chunk-based collision management

## Game Flow & States

### Initialization
1. Load GameSettings and create Phaser game instance
2. Initialize GameScene with background, terrain, and player
3. Setup camera follow and input managers
4. Begin infinite terrain generation

### Game Loop
1. **Input Processing**: Handle touch/keyboard input
2. **Physics Update**: Update player momentum and position  
3. **Terrain Management**: Generate new chunks, cleanup old ones
4. **Collision Detection**: Handle ground following and terrain interaction
5. **Scoring**: Track air time, spins, and combos
6. **UI Updates**: Update score displays and trick popups

### Key Game Mechanics
- **Flow State**: Emphasis on smooth, flowing movement over challenge
- **Momentum Mastery**: Reward system for building and using speed effectively  
- **Forgiving Design**: Auto-correction and enhanced jump detection prevent frustration
- **Visual Polish**: Atmospheric winter environment with attention to detail

## Mobile Optimization

### Portrait Design
- **Aspect Ratio**: 1:2 (400x800) for mobile screens
- **Touch Controls**: Full-screen tap area for accessibility
- **Camera Position**: Player in lower third for forward visibility
- **UI Scaling**: Camera-relative positioning for all interface elements

### Performance Considerations
- **Chunk Management**: Automatic cleanup prevents memory issues
- **Collision Optimization**: Matter.js bodies only for visible terrain
- **Asset Management**: Minimal sprite approach with programmatic graphics

## Development Patterns

### Code Organization
- **Modular Systems**: Separated concerns for maintainability
- **TypeScript**: Full type safety and modern JavaScript features
- **Event-Driven**: Callbacks for trick completion, landing events
- **Configuration-Based**: Centralized settings for easy tuning

### Debug Features
- Console logging for physics events and state changes
- Matter.js debug rendering (when enabled)
- Performance monitoring for chunk generation

## Key Implementation Details

### Terrain-Following Algorithm
```typescript
// Check multiple detection methods for different scenarios
if (this.canJumpFromGround()) {
  // More forgiving jump (30-120px threshold based on slope/speed)
} else if (this.isTrulyAirborne()) {
  // Allow spinning only when clear of terrain (15px)
} else if (this.isOnGround) {
  // Basic ground state for movement physics
}
```

### Momentum Launch System
```typescript
// Speed-to-launch conversion on upward ramps
if (isUpwardRamp && hasSpeed && significantRamp) {
  const speedBonus = (this.velocity.x - this.baseSpeed) / (this.maxSpeed - this.baseSpeed)
  const launchPower = speedBonus * this.momentumMultiplier * 400
}
```

## Performance Improvements & Optimizations

### Background Rendering Optimization
**Problem**: Complex pixel-by-pixel mountain generation was causing severe performance lag
**Solution**: 
- Replaced pixel rendering with smooth curve-based mountain generation
- Reduced draw calls from ~10,000+ pixels to ~25 points per mountain layer
- Eliminated complex shading, tree generation, and detail calculations per pixel
- Result: Dramatic performance improvement while maintaining visual quality

### Speed & Physics Rebalancing  
**Problem**: Original speeds were too slow, uphill momentum was lost too easily
**Solution**:
- Increased base speed from 300 to 400px/s
- Increased max speed from 1800 to 2800px/s  
- Enhanced hill climb system using torque multiplier (2.8) × hill climb power (4.0)
- Reduced friction across all surfaces for better speed retention
- Balanced downhill bonuses (up to +400 speed vs previous +300)

### Terrain Generation Enhancement
**Problem**: Limited terrain variety, predictable patterns
**Solution**:
- Added 6 new terrain types with distinct characteristics and behaviors
- Extended terrain features across multiple chunks (4-8 chunks for epic downhills)
- Color-coded terrain system for visual feedback
- Increased terrain variety: 35% epic downhills, 20% steep uphills, 12% dramatic hills, etc.

### Memory & Cleanup Optimization
**Problem**: Potential memory leaks from complex terrain generation
**Solution**:
- Efficient chunk cleanup system removes old terrain
- Simplified collision detection with proper Matter.js body disposal
- Reduced parallel mountain layers from 5 to 3 (more detailed but fewer)

## Current Game Balance

### Speed Characteristics
- **Flat Ground**: 400px/s base speed (33% faster than before)
- **Moderate Downhills**: 1500-2000px/s (exciting but controlled)  
- **Epic Downhills**: 2500-3300px/s (thrilling maximum speeds)
- **Uphills**: Excellent momentum retention (major improvement)
- **Minimum Speed**: 350px/s (75% faster than before for better flow)

### Terrain Distribution  
- **35%** Epic Downhills - Long speed-building sections
- **20%** Steep Uphills - Challenging momentum tests  
- **13%** Mini Slopes - Quick rhythm changes
- **12%** Dramatic Hills - Complex rolling terrain
- **12%** Massive Jumps - Big air opportunities
- **5%** Speed Valleys - Deep momentum builders
- **3%** Flat Sections - Brief breathing room

This document serves as a comprehensive reference for understanding, maintaining, and extending the Alto's Odyssey-style snowboarding game. All systems have been optimized for performance while enhancing the exciting, high-speed gameplay experience that emphasizes flow, momentum, and thrilling terrain variety.