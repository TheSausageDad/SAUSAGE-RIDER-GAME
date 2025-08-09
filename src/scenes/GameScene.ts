import GameSettings from "../config/GameSettings"
import { Motorcycle } from "../objects/Motorcycle"
import { Token } from "../objects/Token"
import { Spike } from "../objects/Spike"
import { MovingPlatform } from "../objects/MovingPlatform"
import { LevelGenerator } from "../systems/LevelGenerator"
import { InputManager } from "../systems/InputManager"
import { ScoreManager } from "../systems/ScoreManager"

export class GameScene extends Phaser.Scene {
  private motorcycle!: Motorcycle
  private levelGenerator!: LevelGenerator
  private inputManager!: InputManager
  private scoreManager!: ScoreManager
  
  private camera!: Phaser.Cameras.Scene2D.Camera
  private gameState: 'playing' | 'gameOver' = 'playing'
  
  // Physics collections for Matter
  private groundBodies: Phaser.GameObjects.GameObject[] = []
  private tokenBodies: Token[] = []
  private spikeBodies: Spike[] = []
  private platformBodies: MovingPlatform[] = []

  constructor() {
    super({ key: "GameScene" })
  }

  preload(): void {}

  create(): void {
    this.setupPhysics()
    this.createGameObjects()
    this.setupCamera()
    this.setupCollisions()
    this.setupManagers()
    
    this.startGame()
  }

  private setupPhysics(): void {
    // Matter physics setup is done in main.ts config
    // Set world bounds for cleanup purposes
    this.matter.world.setBounds(0, 0, 0, GameSettings.canvas.height + 200)
  }

  private createGameObjects(): void {
    // Initialize physics collections
    this.groundBodies = []
    this.tokenBodies = []
    this.spikeBodies = []
    this.platformBodies = []

    // Create motorcycle
    this.motorcycle = new Motorcycle(
      this, 
      GameSettings.motorcycle.startX, 
      GameSettings.motorcycle.startY
    )

    // Setup motorcycle callbacks
    this.motorcycle.onFlipComplete = (flips: number) => {
      this.scoreManager.addFlip()
    }

    this.motorcycle.onDeath = () => {
      this.gameOver()
    }
  }

  private setupCamera(): void {
    this.camera = this.cameras.main
    this.camera.setSize(GameSettings.canvas.width, GameSettings.canvas.height)
    this.camera.startFollow(this.motorcycle, true, 0.1, 0.05)
    this.camera.setFollowOffset(-300, 0) // Offset to see ahead
    this.camera.setBounds(0, 0, Number.MAX_SAFE_INTEGER, GameSettings.canvas.height)
  }

  private setupCollisions(): void {
    // Matter.js collision detection will be handled in update loop
    // Set up collision event listener
    this.matter.world.on('collisionstart', (event: any) => {
      const pairs = event.pairs
      
      pairs.forEach((pair: any) => {
        const { bodyA, bodyB } = pair
        
        // Check motorcycle collisions
        if (this.isMotorcycleBody(bodyA) || this.isMotorcycleBody(bodyB)) {
          this.handleMotorcycleCollision(bodyA, bodyB)
        }
      })
    })
  }
  
  private isMotorcycleBody(body: any): boolean {
    return body === this.motorcycle.body || 
           body === this.motorcycle.chassisBody ||
           body === this.motorcycle.frontWheelBody ||
           body === this.motorcycle.backWheelBody
  }
  
  private handleMotorcycleCollision(bodyA: any, bodyB: any): void {
    // Handle token collection
    this.tokenBodies.forEach(token => {
      if (token.body === bodyA || token.body === bodyB) {
        if (!token.isCollected) {
          token.collect()
          this.scoreManager.addToken()
        }
      }
    })
    
    // Handle spike damage
    this.spikeBodies.forEach(spike => {
      if (spike.body === bodyA || spike.body === bodyB) {
        spike.triggerHit()
        this.gameOver()
      }
    })
  }

  private setupManagers(): void {
    // Level generator
    this.levelGenerator = new LevelGenerator(this)

    // Input manager
    this.inputManager = new InputManager(this)
    this.inputManager.onInputActive = (isActive: boolean) => {
      if (this.gameState === 'playing') {
        this.motorcycle.handleInput(isActive)
      } else if (this.gameState === 'gameOver') {
        // Restart game on any input
        this.restartGame()
      }
    }
    
    this.inputManager.onTurboActive = (isActive: boolean) => {
      if (this.gameState === 'playing') {
        this.motorcycle.setTurbo(isActive)
        this.scoreManager.showTurbo(isActive)
      }
    }

    // Score manager
    this.scoreManager = new ScoreManager(this)
    this.scoreManager.onSpeedChange = (newSpeed: number) => {
      // Could adjust level generation or other game elements based on speed
    }
  }

  private startGame(): void {
    this.gameState = 'playing'
  }

  private gameOver(): void {
    this.gameState = 'gameOver'
    this.scoreManager.showGameOver()
    
    // Stop motorcycle physics with Matter.js
    const Matter = (this.matter as any).Matter
    if (this.motorcycle.body) {
      Matter.Body.setVelocity(this.motorcycle.body, { x: 0, y: this.motorcycle.body.velocity.y })
    }
  }

  private restartGame(): void {
    // Reset all systems
    this.scoreManager.reset()
    
    // Reset motorcycle
    this.motorcycle.reset(GameSettings.motorcycle.startX, GameSettings.motorcycle.startY)
    
    // Reset camera
    this.camera.setScroll(0, 0)
    
    // Clear and regenerate level
    this.levelGenerator.destroy()
    this.clearPhysicsGroups()
    
    // Recreate level generator
    this.levelGenerator = new LevelGenerator(this)
    
    // Restart game
    this.gameState = 'playing'
  }

  private clearPhysicsGroups(): void {
    // Clear Matter physics collections
    this.tokenBodies.forEach(token => token.destroy())
    this.spikeBodies.forEach(spike => spike.destroy())
    this.platformBodies.forEach(platform => platform.destroy())
    this.groundBodies.forEach(ground => ground.destroy())
    
    this.tokenBodies = []
    this.spikeBodies = []
    this.platformBodies = []
    this.groundBodies = []
  }

  update(time: number, deltaTime: number): void {
    if (this.gameState === 'playing') {
      // Update game systems
      this.inputManager.update()
      this.motorcycle.update(deltaTime)
      this.scoreManager.update()
      
      // Update level generation based on camera position
      this.levelGenerator.update(this.camera.scrollX)
      
      // Update physics groups with current level objects
      this.updatePhysicsGroups()
      
      // Update collectibles and obstacles
      this.updateGameObjects(deltaTime)
    }
  }

  private updatePhysicsGroups(): void {
    // Update ground bodies collection
    const groundBodies = this.levelGenerator.getGroundBodies()
    groundBodies.forEach(body => {
      if (!this.groundBodies.includes(body)) {
        this.groundBodies.push(body)
      }
    })

    // Update tokens collection
    const tokens = this.levelGenerator.getTokens()
    tokens.forEach(token => {
      if (!this.tokenBodies.includes(token)) {
        this.tokenBodies.push(token)
      }
    })

    // Update spikes collection
    const spikes = this.levelGenerator.getSpikes()
    spikes.forEach(spike => {
      if (!this.spikeBodies.includes(spike)) {
        this.spikeBodies.push(spike)
      }
    })

    // Update moving platforms collection
    const platforms = this.levelGenerator.getMovingPlatforms()
    platforms.forEach(platform => {
      if (!this.platformBodies.includes(platform)) {
        this.platformBodies.push(platform)
      }
    })
  }

  private updateGameObjects(deltaTime: number): void {
    // Update tokens
    this.levelGenerator.getTokens().forEach(token => {
      token.update(deltaTime)
    })

    // Update spikes
    this.levelGenerator.getSpikes().forEach(spike => {
      spike.update(deltaTime)
    })

    // Update moving platforms
    this.levelGenerator.getMovingPlatforms().forEach(platform => {
      platform.update(deltaTime)
    })
  }

  // --- Scene Shutdown Logic ---
  shutdown(): void {
    if (this.inputManager) {
      this.inputManager.destroy()
    }
    if (this.scoreManager) {
      this.scoreManager.destroy()
    }
    if (this.levelGenerator) {
      this.levelGenerator.destroy()
    }
  }
}
