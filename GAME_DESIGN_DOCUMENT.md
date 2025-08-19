

# Alto's Odyssey Style Snowboarding Game - Design Document

## Game Overview
An endless runner snowboarding game inspired by Alto's Odyssey, where players carve through snowy mountain slopes, perform aerial spins, and build momentum for spectacular launches. Built for Remix platform with mobile-first portrait orientation (400x800).

## Core Gameplay

### Objective
- Carve through endless snowy mountain slopes and perform aerial tricks
- Build momentum downhill to achieve massive launches off ramps and hills
- Master the physics system to chain combos and achieve high scores

### Controls
- **Mobile**: Tap and hold screen to jump and spin
- **Desktop**: Spacebar (hold) to jump and spin
- **First Press**: Jump off terrain (more forgiving on steep slopes with momentum)
- **Hold in Air**: Perform continuous 360° spins
- **Release**: Auto-correct rotation for safe landings

### Scoring System
- **360° Spins**: 500 points per complete rotation
- **Air Time**: 100 points per second airborne
- **Big Air**: 300 bonus points (2+ seconds airborne)
- **Massive Air**: 500 bonus points (3+ seconds airborne)
- **Combo Multiplier**: Based on air time and trick count
- **Tokens**: 1 point per token collected

## Character & Physics

### Snowboarder
- Detailed sprite with winter gear: blue jacket, orange beanie, dark goggles, snowboard
- Alto's Odyssey inspired physics with realistic momentum and slope interaction
- **Momentum System**: Speed builds naturally downhill, slows on uphills
- **Enhanced Downhill**: 6x acceleration, speeds up to 800+ on steep slopes
- **Momentum Launches**: Speed converts to jump power on upward ramps
- **Smart Ground Following**: Follows terrain contours naturally

### Physics Features
- **Slope-Based Movement**: Gravity and momentum affect speed based on terrain angle
- **Forgiving Jump Detection**: Can jump from terrain even with momentum (120px threshold on uphill)
- **Auto-Correction**: Prevents crashes by auto-correcting upside-down rotations
- **Natural Falling**: On terrain drops, player falls naturally instead of being dragged down
- **Matter.js Integration**: Realistic collision detection with terrain physics bodies

### Crash Detection & Game Over
- **Head-First Landing Detection**: Player crashes only when landing nearly upside down (±30° from 180°)
- **Forgiving System**: Can safely land on side, back, or any angle except head-first
- **Visual Feedback**: Game over screen shows final score, spins, and tokens collected
- **Clean Restart**: All UI elements, popups, and terrain reset properly on restart

## Level Design

### Winter Mountain Environment
- **Layered Background**: Multi-depth snow-capped mountains with atmospheric perspective
- **Sky**: Crisp winter blue gradient with snow clouds for atmosphere
- **Portrait Orientation**: 400x800 resolution optimized for mobile devices
- **Camera**: Follows player with offset for optimal terrain viewing ahead

### Terrain Generation (LevelGenerator System)
- **Infinite Chunks**: Seamlessly connected 300px wide terrain segments
- **Terrain Types**:
  - **Flat Ground**: Breathing room and speed building (20% spawn rate)
  - **Flowing Slopes**: Smooth uphill/downhill sections (20% spawn rate)  
  - **Flowing Hills**: Bell-curved peaks for launching (30% spawn rate)
  - **Flowing Valleys**: Speed-building dips (15% spawn rate)
  - **Big Jumps**: Steep ramps for massive air (15% spawn rate)
- **Visual Variety**: Different snow tints (powder blue, steel blue, cornflower blue)
- **Seamless Connection**: Each chunk connects perfectly using height/angle tracking

### Token Trail System
- **Smart Trail Generation**: Three distinct trail types create followable collection paths
  - **Ground-Following Trails**: 4-6 tokens that hug terrain contours (60-100px above ground)
  - **Jump Arc Trails**: 5-6 tokens forming parabolic arcs for mid-air collection
  - **Ramp Launch Trails**: 6-7 tokens simulating realistic launch trajectories with physics
- **Collision Detection**: Matter.js sensor system detects player-token overlaps
- **Collection Feedback**: Visual collection animation with score popup and sound effects
- **Spawn Rate**: 80% chance per terrain chunk to generate a trail

## Technical Requirements

### Platform
- **Primary**: Mobile (portrait 400x800)
- **Secondary**: Desktop support with keyboard controls
- Built for Remix platform integration
- Phaser.js with Matter.js physics engine
- TypeScript for type-safe development

### Technical Systems
- **InputManager**: Unified touch/keyboard input handling with game state management
- **LevelGenerator**: Infinite procedural terrain generation with chunk management and trail systems
- **ScoreManager**: UI system with camera-relative positioning, combo tracking, and popup cleanup
- **Collision System**: Dual-physics approach - custom movement physics + Matter.js collision detection
- **Advanced Physics**: Momentum-based movement, ground detection, auto-correction, and terrain following
- **Performance**: Efficient chunk cleanup, optimized collision detection, and memory management

## Art Style & Aesthetics
- **Winter Theme**: Snow-white terrain with blue tints and outlines
- **Character Design**: Detailed snowboarder with realistic winter gear
- **Environmental Art**: Layered mountain backgrounds with atmospheric depth
- **Color Palette**: Blues, whites, and oranges (beanie) for winter atmosphere
- **Clean Minimalism**: Alto's Odyssey inspired simple but detailed graphics

## Architecture Highlights
- **Modular Systems**: Separated concerns (input, scoring, terrain, physics)
- **Infinite Generation**: Seamless chunk-based terrain with proper cleanup
- **Mobile Optimization**: Portrait orientation, touch controls, performance considerations
- **Physics Integration**: Matter.js bodies perfectly aligned with visual terrain
- **State Management**: Proper game state handling and scene management

## Unique Features
- **Momentum Physics**: Speed naturally builds downhill and converts to jump power
- **Forgiving Controls**: Enhanced jump detection prevents frustrating missed inputs (up to 120px threshold)
- **Smart Crash Detection**: Only crashes on head-first landings, allowing creative landing styles
- **Followable Token Trails**: Three types of intelligently designed collection paths encourage skillful play
- **Dual Physics System**: Custom movement physics combined with Matter.js collision detection
- **Terrain Variety**: 5 different procedural terrain types with seamless connections
- **Visual Polish**: Multi-layer backgrounds and atmospheric winter environment
- **Clean State Management**: Proper restart system with complete UI and memory cleanup

## Recent Updates & Fixes

### Version 2.0 - Token Collection & Polish Update

#### Token Trail System Implementation
- **Ground-Following Trails**: Tokens placed along terrain contours using interpolated height detection
- **Jump Arc Trails**: Parabolic token placement for mid-air collection opportunities  
- **Ramp Launch Trails**: Physics-simulated trajectory trails with gravity and velocity calculations
- **Smart Placement**: Tokens avoid ground collision and respect terrain boundaries

#### Collision Detection System
- **Player Physics Body**: Non-interfering Matter.js sensor body for collision detection only
- **Dual Physics**: Custom movement system preserved, Matter.js used purely for collision events
- **Token Integration**: Sensor bodies on tokens with proper collision event handling
- **Collection Feedback**: Visual animation, score popup, and console logging on collection

#### Game Over & Restart System
- **Crash Detection**: Head-first landing detection using rotation normalization (±30° tolerance)
- **UI Cleanup**: Complete popup tracking and destruction on restart/game over
- **State Management**: Proper game state transitions and input handling
- **Memory Management**: Level generator recreation and reference updating on restart

#### Physics Refinements  
- **Jump System**: Forward-bias jumping with terrain angle compensation
- **Ground Detection**: Enhanced collision detection with terrain drops and momentum launches
- **Auto-Correction**: Smart rotation correction for safe landings while airborne
- **Slope Physics**: Enhanced downhill acceleration and uphill momentum preservation

#### Technical Architecture
- **Modular Design**: Clear separation of concerns between physics, rendering, and game logic
- **Performance**: Efficient chunk-based terrain with automatic cleanup behind camera
- **Mobile Optimization**: Portrait layout with touch-friendly controls and UI positioning
- **Type Safety**: Full TypeScript implementation with proper type definitions