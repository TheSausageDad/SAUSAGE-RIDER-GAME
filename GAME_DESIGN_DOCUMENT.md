

## Game Overview
An endless runner motorcycle game where players flip through the air and collect tokens to achieve the highest score possible. Built for Farcade SDK with mobile-first portrait orientation.

## Core Gameplay

### Objective
- Survive as long as possible while performing flips and collecting tokens
- Achieve the highest score through flips and collectibles

### Controls
- **Mobile**: Tap and hold screen
- **Desktop**: Spacebar (hold)
- **On Ground**: Accelerate motorcycle faster
- **In Air**: Start/continue flipping

### Scoring System
- **Flips**: 10 points per complete rotation
- **Tokens**: 1 point per token collected
- **Goal**: Endless high-score gameplay

## Vehicle & Physics

### Motorcycle
- Placeholder sprite initially (custom asset to be provided later)
- Arcade-style physics with realistic gravity
- Floaty air control - arcs upward then down naturally
- Can hit jumps without issues

### Death Conditions
- Landing on back/upside down
- Hitting spikes or hazardous objects
- **NOT** from falling or normal crashes

## Level Design

### Environment
- Blank terrain and background initially
- Portrait orientation optimized for all mobile screen sizes
- Procedurally generated sections for variety

### Obstacles & Features
- **Spikes**: Instant death on contact
- **Moving Platforms**: Elevator-style, upward movement only
- **Jump Ramps**: Varying sizes and heights
- **Tokens**: Collectible items scattered throughout level

### Progression
- Speed increases over time
- Difficulty ramps up gradually
- Different level sections to prevent repetition
- No safe "breathing room" - constant challenge

## Technical Requirements

### Platform
- **Primary**: Mobile (portrait)
- **Secondary**: Desktop support
- Built for Farcade SDK integration
- Responsive design for all screen resolutions

### Features
- No unlock system or currency
- No power-ups (planned for future)
- Endless runner format
- Immediate restart on death

## Art Style
- Simple, detailed graphics
- Clean visual design
- Mobile-optimized assets
- Portrait aspect ratio focus

## Future Considerations
- Power-ups system
- Custom motorcycle asset integration
- Enhanced visual effects
- Additional obstacle types