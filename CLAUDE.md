# Alto's Odyssey Style Snowboarding Game - Technical Reference

## Game Summary
An endless runner snowboarding game inspired by Alto's Odyssey, featuring realistic momentum-based physics, exciting procedural terrain generation, and mobile-optimized portrait gameplay. Built with Phaser.js, TypeScript, and Matter.js physics with major performance and gameplay improvements.

## Recent Major Updates (Latest Version)
- **Enhanced Speed System**: Balanced high-speed gameplay with excellent uphill momentum retention
- **New Terrain Types**: 6 exciting terrain varieties including epic downhills and dramatic hills
- **Optimized Backgrounds**: Performance-optimized parallax mountains with detailed trees
- **Improved Physics**: Better acceleration, friction, and hill climbing mechanics
- **Visual Enhancements**: Color-coded terrain types and atmospheric mountain backgrounds

## Latest Session Updates (Current Build)
- **Enhanced Jump Mechanics**: Significantly improved hill jump power (250 launch multiplier, 67% increase) and jump boost (120, 50% increase)
- **Anti-Double Jump System**: Increased jump cooldown to 600ms and tightened all jump thresholds by ~50% for precise control
- **Audio System Enhancements**: Individual flip combo sounds with progressive pitch scaling (1.0 → 1.08 → 1.16 per flip)
- **Flip Detection Refinement**: Changed flip completion from 360° to 270° (75% rotation) for more responsive registration
- **Auto-Correction Improvement**: Increased recovery speed from 30 to 100 degrees/second for faster upright recovery
- **Menu System Polish**: Optimized button sizes (225px width) and positioning, removed pulse animations for cleaner UI
- **Rail Grinding System Overhaul**: Complete rail grinding implementation with smooth continuous scoring
- **Player Size Enhancement**: 75% larger player sprite (0.18 → 0.32 scale) with proportional collision body
- **Velocity Control System**: Fixed extreme velocity bugs with proper acceleration capping and limits

## Core Systems Architecture

### 1. Player Character (`src/objects/Motorcycle.ts`)
**High-Speed Snowboarder with Enhanced Physics**

- **Visual Design**: Sausage character sprite (`SausageSkiLeanin.png`) with flipping animation (`Flipping.png`)
- **Enhanced Visual Scale**: 75% larger sprite (0.32 scale) with proportional collision body (22px radius)
- **Physics Engine**: Matter.js integration with custom momentum system and velocity control
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

**Enhanced Jump System**:
- **Forgiving Ground Detection**: Dual detection system for rolling hills
  - `isOnGround`: Basic physics flag
  - `canJumpFromGround()`: Tightened detection thresholds (25-75px based on slope, reduced ~50%)
  - `isTrulyAirborne()`: Strict airborne check (30px clearance)
- **Enhanced Anti-Double Jump**: 600ms cooldown prevents air jumping and near-double jumps
- **Improved Hill Jump Power**: Launch power multiplier increased to 250 (67% increase from 150)
- **Enhanced Jump Boost**: Input-held jump boost increased to 120 (50% increase from 80)
- **Maximum Launch Power**: Increased to 450 (50% increase from 300)
- **Momentum Launches**: Speed converts to jump power on upward ramps with enhanced multipliers

**Spin System**:
- Continuous 360°/second rotation while input held
- **Enhanced Auto-correction**: 100°/second recovery speed (increased from 30°/second)
- **Improved Flip Detection**: Flip completion at 270° rotation (75% of full spin) for more responsive registration
- **Progressive Audio Feedback**: Individual flip sounds with pitch scaling (1.0 → 1.08 → 1.16 per successive flip)
- Only functions when truly airborne (15px clearance)

### 2. Terrain Generation (`src/systems/LevelGenerator.ts`)
**Exciting Infinite Procedural World Generation**

**Chunk System**:
- 300px wide seamless terrain segments
- 3x screen width view distance generation
- Automatic cleanup of chunks behind camera
- Extended terrain features spanning multiple chunks

**Rebalanced Terrain Types** (with updated spawn rates):
```typescript
if (terrainType < 0.35) createEpicDownhill()    // 35% - Epic 4-8 chunk downhills (400-1000px deep)
else if (terrainType < 0.55) createSteepUphill() // 20% - Challenging 3-6 chunk uphills (250-550px up)
else if (terrainType < 0.68) createMiniSlopes()  // 13% - Quick 1-2 chunk elevation changes (±100px)
else if (terrainType < 0.8) createDramaticHills() // 12% - 3-5 chunk dramatic rolling terrain
else if (terrainType < 0.95) createRailFlat()    // 5% - RARE flat rail grinding sections (2-3 chunks)
else if (terrainType < 0.98) createRailDownhill() // 3% - VERY RARE downhill rails (3-4 chunks)
else createExtendedFlat()                        // 2% - 1 chunk flat sections (minimal)
```

**Terrain Features**:
- **Epic Downhills**: Very long speed-building sections with accelerating curves
- **Steep Uphills**: Challenging climbs that test momentum retention
- **Mini Slopes**: Quick elevation changes with multiple small bumps
- **Dramatic Hills**: Complex multi-wave terrain with large elevation changes
- **Rail Grinding**: RARE special terrain blocks with guaranteed rail spawning (8% total)
- **Extended Flat**: Minimal breathing room sections

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

### 4. Rail Grinding System (`src/objects/Rail.ts` & `src/objects/Motorcycle.ts`)
**Smooth Continuous Rail Grinding Mechanics**

**Rail Detection System**:
- **Distance-based detection**: 200px horizontal, 150px vertical range
- **Velocity validation**: Speed under 1500px/s for stable grinding
- **Anti-clustering system**: 5-7 chunk cooldowns prevent consecutive rails
- **Dual physics**: Sensor-based collision + distance verification

**Grinding Physics**:
- **Sticky rail movement**: Player follows rail slope and angle
- **Momentum preservation**: Maintains horizontal speed during grind
- **Clean exit system**: 300ms jump cooldown + `justJumpedOffRail` flag
- **Boundary detection**: Lenient 80px buffer for smooth grinding

**Visual Feedback**:
- **Persistent score display**: Single rising score text (not popup spam)
- **Gold spark particles**: 8 sparks every 10ms during grinding
- **Real-time updates**: Shows time and accumulated score
- **Smooth completion**: Elegant fade-out animation with final total

**Scoring System**:
- **Continuous points**: 20 points per 0.1 second (200 points/second)
- **No spam popups**: Score accumulates in single display
- **Final total**: Added to player score when grind completes

### 5. Scoring System (`src/systems/ScoreManager.ts`)
**Comprehensive Trick and Combo System**

**Scoring Breakdown**:
- **360° Spins**: 500 points each (now triggered at 270° for responsiveness)
- **Air Time**: 100 points per second
- **Big Air**: 300 bonus (2+ seconds)
- **Massive Air**: 500 bonus (3+ seconds)
- **Combo Multiplier**: `1 + (airTime/2) + (trickCount * 0.5)`

**Enhanced Audio Feedback**:
- **Individual Flip Sounds**: Each completed flip triggers combo sound with progressive pitch
- **Pitch Scaling**: Starts at 1.0, increases by 0.08 per flip (1.0 → 1.08 → 1.16 → etc.)
- **Pitch Cap**: Maximum at 6th flip, stays constant thereafter
- **Sound Reset**: Flip counter and pitch reset on each landing for new air sessions

**UI Elements** (Camera-relative with `setScrollFactor(0)`):
- Score and token display (top-left)
- Spin counter (top-right)
- Control hints (bottom)
- Trick combo popups (center screen)

### 6. Game Scene (`src/scenes/GameScene.ts`)
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
  // Tightened jump detection (25-75px threshold based on slope/speed, ~50% reduction)
} else if (this.isTrulyAirborne()) {
  // Allow spinning only when clear of terrain (15px)
} else if (this.isOnGround) {
  // Basic ground state for movement physics
}
```

### Momentum Launch System
```typescript
// Enhanced speed-to-launch conversion on upward ramps
if (isUpwardRamp && hasSpeed && significantRamp) {
  const speedBonus = (this.velocity.x - this.baseSpeed) / (this.maxSpeed - this.baseSpeed)
  const launchPower = speedBonus * this.momentumMultiplier * 250 // Increased multiplier
  // Maximum total launch power: 450 (50% increase from 300)
  // Jump boost when holding input: 120 (50% increase from 80)
}
```

## Latest Technical Improvements

### Rail Grinding System Implementation
**Problem**: Complex rail detection and grinding mechanics needed implementation
**Solution**: 
- Implemented distance-based detection with velocity validation
- Created sticky rail physics with slope following
- Added persistent score display system with real-time updates
- Implemented anti-clustering system (5-7 chunk cooldowns)
- Result: Smooth, rewarding rail grinding with clean visual feedback

### Jump System Enhancement  
**Problem**: Players couldn't jump reliably on rolling hills, double jumping was possible
**Solution**:
- Enhanced ground detection with tightened thresholds (25-75px based on slope, reduced ~50%)
- Increased jump cooldown to 600ms to prevent double jumping and near-double jumps
- Significantly improved hill jump mechanics (250 launch multiplier, 67% increase)
- Enhanced jump boost when holding input (120, 50% increase from 80)
- Increased maximum total launch power to 450 (50% increase from 300)
- Result: More responsive and powerful jumping with precise anti-exploit controls

### Player Visibility & Collision Improvement
**Problem**: Player sprite too small and poorly aligned with collision detection
**Solution**:
- Increased player scale from 0.18 to 0.32 (75% larger)
- Enlarged collision body from 15px to 22px radius proportionally
- Adjusted all positioning offsets from 20px to 30px consistently
- Updated all state transitions to maintain proper scaling
- Result: More visible player with accurate collision alignment

### Velocity Control & Physics Stability
**Problem**: Extreme velocities (25000px/s) causing physics explosions and rail detection failures
**Solution**:
- Added acceleration capping (max 0.8 per frame) to prevent velocity spikes
- Implemented dynamic velocity limits based on game settings (1080px/s max normal)
- Enhanced velocity validation for rail detection (1500px/s threshold)
- Added comprehensive velocity debugging and monitoring
- Result: Stable physics with predictable speed ranges

### Visual & Debug Management
**Problem**: Debug hitboxes cluttering gameplay, inconsistent visual presentation
**Solution**:
- Disabled all debug visuals by default for clean gameplay
- Implemented on-demand collision outline system for debugging
- Removed testing mode forced rail spawning
- Organized debug systems for easy enable/disable
- Result: Professional visual presentation with debugging capabilities available

### Menu System & UI Polish
**Problem**: Menu buttons had inconsistent sizing and distracting animations
**Solution**:
- Standardized button widths to 225px for both Start and How to Play buttons
- Removed pulse animations (1.05x scale) for cleaner, more professional appearance
- Repositioned How to Play button down 20px (height-60) for better spacing
- Result: Clean, consistent menu interface with improved visual hierarchy

### Enhanced Audio Feedback System
**Problem**: Limited audio feedback for tricks, no individual flip recognition
**Solution**:
- Implemented individual flip sound system with progressive pitch scaling
- Each completed flip (270°) triggers combo sound with increasing pitch (1.0 → 1.08 → 1.16)
- Pitch caps at 6th flip and maintains constant level thereafter
- Sound counter resets on landing for each new air session
- Removed combo sound from non-flip tricks (big air, etc.) for clarity
- Result: Rich audio feedback that rewards consecutive flips with escalating excitement

### Flip Detection & Auto-Correction Improvements
**Problem**: Flip detection required full 360° rotation, slow auto-correction felt sluggish
**Solution**:
- Reduced flip completion threshold from 360° to 270° (75% rotation) for responsive feel
- Increased auto-correction speed from 30°/second to 100°/second for rapid recovery
- Flip counter resets on landing to restart sound progression
- Result: More forgiving and responsive spin mechanics with faster recovery

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