/**
 * Game Settings for Motorcycle Endless Runner
 * Centralized configuration for all tunable game parameters
 */

export const GameSettings = {
  debug: true,

  canvas: {
    width: 1000,
    height: 1800,
  },

  motorcycle: {
    width: 60,
    height: 30,
    maxSpeed: 1800,
    acceleration: 2500, // Much higher base acceleration for power
    airControl: 0.4,
    jumpPower: 900, // More jump power
    gravity: 800, // Reduced gravity for the motorcycle specifically
    flipSpeed: 360, // degrees per second
    startX: 200,
    startY: 1500, // Fixed: positioned above ground (ground is at 1600)
    hillClimbPower: 2.5, // Much more power when climbing
    mass: 0.8, // Lighter mass for better acceleration
    boostPower: 3500, // Extra boost when really stuck
    minSpeed: 200, // Minimum speed to maintain
    torqueMultiplier: 1.8, // Torque for wheel grip
  },

  physics: {
    gravity: 1000, // Reduced overall gravity
    groundFriction: 0.985, // Less friction for maintaining speed
    airFriction: 0.998, // Less air resistance
    slopeFriction: 0.95, // Special friction for slopes
  },

  level: {
    scrollSpeed: 400, // base scroll speed
    speedIncrement: 20, // speed increase per 10 seconds
    maxSpeed: 1000,
    groundY: 1600,
    chunkWidth: 400,
    rampHeight: 150,
    platformHeight: 100,
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
