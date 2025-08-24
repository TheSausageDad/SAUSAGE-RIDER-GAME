/**
 * Game Settings for Motorcycle Endless Runner
 * Centralized configuration for all tunable game parameters
 */

export const GameSettings = {
  debug: false,

  canvas: {
    width: 400, // Portrait: narrower width for mobile
    height: 800, // Portrait: taller height for mobile
  },

  motorcycle: {
    width: 60,
    height: 30,
    maxSpeed: 900, // Increased for more excitement while staying controllable
    acceleration: 1200, // Increased for better responsiveness
    airControl: 0.5, // Slightly improved air control
    jumpPower: 600, // Reduced jump power for balanced gameplay
    gravity: 750, // Balanced gravity
    flipSpeed: 360, // degrees per second
    startX: 100, // Adjusted for narrower portrait view
    startY: 220, // Start 500px above ground level (720-500=220)
    hillClimbPower: 2.8, // Slightly increased for better uphill flow
    mass: 0.7, // Slightly lighter for better responsiveness
    boostPower: 2000, // Reduced boost power
    minSpeed: 400, // Increased for faster-paced gameplay
    torqueMultiplier: 1.7, // Slightly increased for better uphill performance
  },

  physics: {
    gravity: 900, // Reduced overall gravity for floatier feel
    groundFriction: 0.96, // More friction for better control
    airFriction: 0.995, // Slight air resistance for balance
    slopeFriction: 0.92, // More friction on slopes for controlled speeds
  },

  level: {
    scrollSpeed: 400, // base scroll speed
    speedIncrement: 20, // speed increase per 10 seconds
    maxSpeed: 1000,
    groundY: 720, // Much lower ground level for more jump space
    chunkWidth: 300, // Smaller chunks for portrait
    rampHeight: 120, // Adjusted for smaller screen
    platformHeight: 80, // Adjusted for smaller screen
  },

  scoring: {
    flipPoints: 10,
    tokenPoints: 1,
    speedBonusMultiplier: 1.1,
  },

  obstacles: {
    spikeWidth: 40,
    spikeHeight: 60,
    platformSpeed: 150,
    spawnRate: 0.7, // probability per chunk
  },

  tokens: {
    size: 15, // Smaller tokens for better visual clarity
    value: 1,
    spawnRate: 0.8, // probability per chunk
  },
}

export default GameSettings
