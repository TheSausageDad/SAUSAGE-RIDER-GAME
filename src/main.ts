import { GameScene } from "./scenes/GameScene"
import { MenuScene } from "./scenes/MenuScene"
import { initializeFarcadeSDK } from "./utils/RemixUtils"
import GameSettings from "./config/GameSettings"

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement

// Game configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL, // Using WebGL for shader support
  width: GameSettings.canvas.width,
  height: GameSettings.canvas.height,
  scale: {
    mode: Phaser.Scale.FIT,
    parent: "gameContainer",
  },
  canvas: canvas,
  backgroundColor: "#111111",
  scene: [MenuScene, GameScene],
  physics: {
    default: "matter",
    matter: {
      gravity: { y: GameSettings.physics.gravity },
      debug: GameSettings.debug
    },
  },
  // Target frame rate
  fps: {
    target: 60,
  },
  // Additional WebGL settings
  pixelArt: false,
  antialias: true,
}

// Create the game instance
const game = new Phaser.Game(config)

// Initialize Farcade SDK
game.events.once("ready", () => {
  initializeFarcadeSDK(game)
})
