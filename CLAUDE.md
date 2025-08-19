# Alto's Odyssey Style Snowboarding Game - Technical Reference

## Game Summary
An endless runner snowboarding game inspired by Alto's Odyssey, featuring realistic momentum-based physics, procedural terrain generation, and mobile-optimized portrait gameplay. Built with Phaser.js, TypeScript, and Matter.js physics.

## Core Systems Architecture

### 1. Player Character (`src/objects/Motorcycle.ts`)
**Snowboarder Character with Advanced Physics**

- **Visual Design**: Detailed sprite with blue winter jacket, orange beanie, dark goggles, snowboard
- **Physics Engine**: Matter.js integration with custom momentum system
- **Movement System**:
  - Base speed: 300px/s on flat ground
  - Downhill acceleration: 6x multiplier + slope bonuses
  - Maximum speeds: 800+ on steep downhills
  - Uphill deceleration: Gentle 2x multiplier to maintain flow

**Key Physics Features**:
```typescript
// Momentum-based speed calculation
const slopeInfluence = Math.sin(terrainAngle) * this.slopeInfluence
const accelerationMultiplier = slopeInfluence > 0 ? 6 + (slopeInfluence * 4) : 2
```

**Jump System**:
- **Ground Detection**: 3-tier system for different scenarios
  - `isOnGround`: Basic physics flag
  - `canJumpFromGround()`: Forgiving jump detection (30-120px threshold)
  - `isTrulyAirborne()`: Strict airborne check (15px clearance)
- **Momentum Launches**: Speed converts to jump power on upward ramps
- **Hill Top Bonuses**: Extra jump power and forgiveness on downward slopes

**Spin System**:
- Continuous 720°/second rotation while input held
- Auto-correction at 360°/second when upside down
- Only functions when truly airborne (15px clearance)

### 2. Terrain Generation (`src/systems/LevelGenerator.ts`)
**Infinite Procedural World Generation**

**Chunk System**:
- 300px wide seamless terrain segments
- 3x screen width view distance generation
- Automatic cleanup of chunks behind camera

**Terrain Types** (with spawn rates):
```typescript
if (terrainType < 0.2) createFlatGround()      // 20% - Speed building
else if (terrainType < 0.4) createFlowingSlope() // 20% - Varied slopes  
else if (terrainType < 0.7) createFlowingHill()  // 30% - Launch ramps
else if (terrainType < 0.85) createFlowingValley() // 15% - Speed dips
else createBigJump()                          // 15% - Massive air
```

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
**Main Game Orchestration**

**Winter Mountain Background**:
- 3-layer mountain system with atmospheric depth
- Winter blue sky gradient (`0x87CEFA` to `0xB0E0E6`)
- Snow clouds and distant peaks for immersion

**Camera System**:
- Follows player with offset `(-100, -150)` for optimal viewing
- Portrait orientation optimized for mobile
- Smooth follow interpolation

## Technical Configuration

### Canvas Settings (`src/config/GameSettings.ts`)
```typescript
canvas: {
  width: 400,   // Portrait mobile optimization
  height: 800,  // 1:2 aspect ratio
}

level: {
  groundY: 600,      // Lower for portrait space
  chunkWidth: 300,   // Optimized for mobile
}
```

### Physics Configuration
- **Matter.js** engine with custom gravity
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

This document serves as a comprehensive reference for understanding, maintaining, and extending the Alto's Odyssey-style snowboarding game. All systems are designed to work together to create a smooth, engaging mobile gaming experience that emphasizes flow and momentum over traditional challenge-based gameplay.