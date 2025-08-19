/**
 * Game Settings for Motorcycle Endless Runner
 * Centralized configuration for all tunable game parameters
 */

export const GameSettings = {
  debug: true,

  canvas: {
    width: 400, // Portrait: narrower width for mobile
    height: 800, // Portrait: taller height for mobile
  },

  motorcycle: {
    width: 60,
    height: 30,
    maxSpeed: 2800, // More reasonable top speed - faster than before but not crazy
    acceleration: 3500, // Good acceleration but not excessive
    airControl: 0.5, // Slightly improved air control
    jumpPower: 1000, // Good jump power
    gravity: 750, // Balanced gravity
    flipSpeed: 360, // degrees per second
    startX: 100, // Adjusted for narrower portrait view
    startY: 220, // Start 500px above ground level (720-500=220)
    hillClimbPower: 4.0, // Good uphill power but not extreme
    mass: 0.6, // Balanced mass
    boostPower: 5000, // Good boost power
    minSpeed: 350, // Higher minimum speed for better flow
    torqueMultiplier: 2.8, // Good torque for uphills without being crazy
  },

  physics: {
    gravity: 900, // Reduced overall gravity for floatier feel
    groundFriction: 0.992, // Much less friction for maintaining speed
    airFriction: 0.999, // Almost no air resistance
    slopeFriction: 0.98, // Much less friction on slopes for better uphill speed retention
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
    size: 25,
    value: 1,
    spawnRate: 0.8, // probability per chunk
  },
}

export default GameSettings
