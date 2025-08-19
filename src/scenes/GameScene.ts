import GameSettings from "../config/GameSettings"
import { Motorcycle } from "../objects/Motorcycle"
import { DynamicTerrain } from "../systems/DynamicTerrain"
import { LevelGenerator } from "../systems/LevelGenerator"
import { InputManager } from "../systems/InputManager"
import { ScoreManager } from "../systems/ScoreManager"

export class GameScene extends Phaser.Scene {
  private motorcycle!: Motorcycle
  private terrain!: DynamicTerrain
  private levelGenerator!: LevelGenerator
  private inputManager!: InputManager
  private scoreManager!: ScoreManager
  
  private camera!: Phaser.Cameras.Scene2D.Camera
  private gameState: 'playing' | 'gameOver' = 'playing'
  
  // Parallax background layers with infinite generation
  private parallaxLayers: { graphics: Phaser.GameObjects.Graphics, scrollFactor: number, layerIndex: number, color: number, lastX: number }[] = []

  constructor() {
    super({ key: "GameScene" })
  }

  preload(): void {
    // Load player images
    this.load.image('player', 'SausageSkiLeanin.png')
    this.load.image('player_flipping', 'Flipping.png')
  }

  create(): void {
    this.createGameObjects()
    this.setupCamera()
    this.setupManagers()
    
    this.startGame()
  }

  private createGameObjects(): void {
    // Create Alto's Odyssey style background
    this.createBackground()
    
    // Create dynamic terrain
    this.terrain = new DynamicTerrain(this, GameSettings.level.groundY, GameSettings.canvas.width)
    
    // Create level generator for infinite terrain chunks
    this.levelGenerator = new LevelGenerator(this)

    // Create motorcycle
    this.motorcycle = new Motorcycle(
      this, 
      GameSettings.motorcycle.startX, 
      GameSettings.motorcycle.startY,
      this.terrain,
      this.levelGenerator
    )

    // Setup motorcycle callbacks
    this.motorcycle.onFlipComplete = (flips: number) => {
      this.scoreManager.addFlip()
    }

    this.motorcycle.onLanding = () => {
      console.log("Snowboarder landed!")
    }

    this.motorcycle.onCrash = () => {
      console.log("Snowboarder crashed! Game Over!")
      this.gameOver()
    }

    this.motorcycle.onTrickComplete = (tricks: string[], multiplier: number, airTime: number) => {
      // Calculate total score for this trick combo
      let baseScore = Math.floor(airTime * 100)
      tricks.forEach(trick => {
        if (trick === "360 Spin") baseScore += 500
        if (trick === "Big Air") baseScore += 300
        if (trick === "Massive Air") baseScore += 500
      })
      
      const totalScore = baseScore * multiplier
      this.scoreManager.addTrickScore(totalScore, tricks, multiplier)
    }
  }

  private createBackground(): void {
    // Dynamic sky gradient that moves slightly with camera for depth
    const skyGraphics = this.add.graphics()
    skyGraphics.fillGradientStyle(0x4169E1, 0x4169E1, 0x87CEEB, 0x87CEEB, 1, 1, 1, 1) // Deeper blue sky
    skyGraphics.fillRect(0, 0, GameSettings.canvas.width * 30, GameSettings.canvas.height)
    skyGraphics.setDepth(-100)
    skyGraphics.setScrollFactor(0.05) // Very slight sky movement for depth
    
    // Initialize infinite parallax mountain system
    this.initializeParallaxMountains()
  }

  private createDetailedMountainLayer(layerIndex: number, depth: number, color: number, scrollFactor: number): void {
    const graphics = this.add.graphics()
    graphics.setDepth(depth)
    graphics.setScrollFactor(scrollFactor) // Parallax effect
    
    const layerWidth = GameSettings.canvas.width * 8
    const canvasHeight = GameSettings.canvas.height
    
    // Base heights for 3 layers - progressively taller but below player terrain (720px)
    const baseHeights = [200, 300, 450] // Well below 680px limit
    let baseHeight = baseHeights[layerIndex] || 200
    
    // Create detailed mountains with trees
    this.createMountainsWithTrees(graphics, layerWidth, canvasHeight, baseHeight, layerIndex, color)
    
    this.parallaxLayers.push({ graphics, scrollFactor, layerIndex, color, lastX: layerWidth - 200 })
  }

  private createMountainsWithTrees(graphics: Phaser.GameObjects.Graphics, layerWidth: number, canvasHeight: number, baseHeight: number, layerIndex: number, mountainColor: number): void {
    const opacity = 0.5 + layerIndex * 0.2 // More visible for detailed mountains
    graphics.fillStyle(mountainColor, opacity)
    
    // Create mountain silhouette first
    graphics.beginPath()
    graphics.moveTo(0, canvasHeight)
    
    const segments = 30 // More detail for tree placement
    const mountainPoints: {x: number, y: number}[] = []
    
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * layerWidth
      const seed = (x + layerIndex * 1000) * 0.002
      
      // Generate mountain peaks that stay well below player terrain
      const peakVariation = Math.sin(seed * 1.2) * (80 + layerIndex * 30) + 
                           Math.sin(seed * 3) * (40 + layerIndex * 15) +
                           Math.sin(seed * 8) * (20 + layerIndex * 8)
      
      const mountainHeight = baseHeight + peakVariation
      const y = Math.min(canvasHeight - mountainHeight, 650) // Stay below player terrain
      
      mountainPoints.push({x, y})
      graphics.lineTo(x, y)
    }
    
    graphics.lineTo(layerWidth, canvasHeight)
    graphics.closePath()
    graphics.fillPath()
    
    // Add trees on mountain slopes
    this.addTreesToMountain(graphics, mountainPoints, layerIndex)
  }

  private addTreesToMountain(graphics: Phaser.GameObjects.Graphics, mountainPoints: {x: number, y: number}[], layerIndex: number): void {
    const treeSize = Math.max(8, 12 - layerIndex * 2) // Smaller trees for distant mountains
    const treeSpacing = 40 + layerIndex * 20 // More spacing for closer mountains
    const treeColor = 0x0F4C2B // Dark forest green
    const trunkColor = 0x4A2C17 // Brown
    
    for (let i = 0; i < mountainPoints.length - 1; i++) {
      const point = mountainPoints[i]
      const nextPoint = mountainPoints[i + 1]
      
      // Calculate slope (don't put trees on very steep slopes)
      const slope = Math.abs(nextPoint.y - point.y) / Math.abs(nextPoint.x - point.x)
      
      // Only place trees on reasonable slopes and with some randomness
      if (slope < 0.8 && point.x % treeSpacing < 5 && Math.random() > 0.4) {
        this.drawTree(graphics, point.x, point.y, treeSize, treeColor, trunkColor)
      }
    }
  }

  private drawTree(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number, treeColor: number, trunkColor: number): void {
    const opacity = 0.7
    
    // Draw trunk
    graphics.fillStyle(trunkColor, opacity)
    graphics.fillRect(x - size/6, y, size/3, size/2)
    
    // Draw tree crown (simple triangle)
    graphics.fillStyle(treeColor, opacity)
    graphics.beginPath()
    graphics.moveTo(x, y - size/2) // Top point
    graphics.lineTo(x - size/2, y) // Bottom left
    graphics.lineTo(x + size/2, y) // Bottom right
    graphics.closePath()
    graphics.fillPath()
    
    // Add smaller top layer for more tree-like appearance
    graphics.fillStyle(treeColor, opacity + 0.1)
    graphics.beginPath()
    graphics.moveTo(x, y - size/3) // Top point
    graphics.lineTo(x - size/3, y - size/6) // Bottom left
    graphics.lineTo(x + size/3, y - size/6) // Bottom right
    graphics.closePath()
    graphics.fillPath()
  }

  private createSimpleMountains(graphics: Phaser.GameObjects.Graphics, layerWidth: number, canvasHeight: number, baseHeight: number, layerIndex: number, mountainColor: number): void {
    const opacity = 0.4 + layerIndex * 0.15 // More visible opacity
    graphics.fillStyle(mountainColor, opacity)
    
    // Create simple mountain silhouette using curves
    graphics.beginPath()
    graphics.moveTo(0, canvasHeight)
    
    const segments = 25 // Slightly more detail
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * layerWidth
      const seed = (x + layerIndex * 1000) * 0.003 // More variation per layer
      
      // Generate mountain peaks that stay well below player terrain (720px)
      const peakVariation = Math.sin(seed * 1.5) * (60 + layerIndex * 20) + 
                           Math.sin(seed * 4) * (30 + layerIndex * 10) +
                           Math.sin(seed * 10) * (15 + layerIndex * 5)
      
      const mountainHeight = baseHeight + peakVariation
      const y = Math.min(canvasHeight - mountainHeight, 680) // Never go above 680px (40px below player ground)
      
      graphics.lineTo(x, y)
    }
    
    graphics.lineTo(layerWidth, canvasHeight)
    graphics.closePath()
    graphics.fillPath()
  }


  private initializeParallaxMountains(): void {
    // Create 3 detailed mountain layers with trees
    const mountainConfigs = [
      { depth: -85, color: 0x2C3E50, scrollFactor: 0.1 },  // Far - dark blue mountains
      { depth: -80, color: 0x34495E, scrollFactor: 0.15 }, // Mid - medium blue-gray  
      { depth: -75, color: 0x5D6D7E, scrollFactor: 0.2 }   // Close - lighter blue-gray
    ]

    mountainConfigs.forEach((config, index) => {
      this.createDetailedMountainLayer(index, config.depth, config.color, config.scrollFactor)
    })
  }

  private updateParallaxMountains(cameraX: number): void {
    // Check each mountain layer and extend if needed
    this.parallaxLayers.forEach(layer => {
      const virtualCameraX = cameraX * layer.scrollFactor
      const distanceAhead = layer.lastX - virtualCameraX
      
      // If we're getting close to the end of this layer, extend it
      if (distanceAhead < GameSettings.canvas.width * 3) {
        this.extendMountainLayer(layer, virtualCameraX)
      }
    })
  }

  private extendMountainLayer(layer: { graphics: Phaser.GameObjects.Graphics, scrollFactor: number, layerIndex: number, color: number, lastX: number }, virtualCameraX: number): void {
    const layerWidth = GameSettings.canvas.width * 4
    const canvasHeight = GameSettings.canvas.height
    const baseHeights = [200, 300, 450] // Match new 3-layer system
    let baseHeight = baseHeights[layer.layerIndex] || 200
    
    const startX = layer.lastX
    
    // Create detailed continuation with trees
    this.createMountainSectionWithTrees(layer.graphics, startX, layerWidth, canvasHeight, baseHeight, layer.layerIndex, layer.color)
    
    layer.lastX = startX + layerWidth
  }

  private createMountainSectionWithTrees(graphics: Phaser.GameObjects.Graphics, startX: number, width: number, canvasHeight: number, baseHeight: number, layerIndex: number, mountainColor: number): void {
    const opacity = 0.5 + layerIndex * 0.2 // Match detailed mountains
    graphics.fillStyle(mountainColor, opacity)
    
    // Create mountain silhouette
    graphics.beginPath()
    graphics.moveTo(startX, canvasHeight)
    
    const segments = 20 // Good detail for extensions
    const mountainPoints: {x: number, y: number}[] = []
    
    for (let i = 0; i <= segments; i++) {
      const x = startX + (i / segments) * width
      const seed = (x + layerIndex * 1000) * 0.002
      
      // Generate mountain peaks that stay well below player terrain
      const peakVariation = Math.sin(seed * 1.2) * (80 + layerIndex * 30) + 
                           Math.sin(seed * 3) * (40 + layerIndex * 15) +
                           Math.sin(seed * 8) * (20 + layerIndex * 8)
      
      const mountainHeight = baseHeight + peakVariation
      const y = Math.min(canvasHeight - mountainHeight, 650) // Stay below player terrain
      
      mountainPoints.push({x, y})
      graphics.lineTo(x, y)
    }
    
    graphics.lineTo(startX + width, canvasHeight)
    graphics.closePath()
    graphics.fillPath()
    
    // Add trees to the extended section
    this.addTreesToMountain(graphics, mountainPoints, layerIndex)
  }

  private createSimpleMountainSection(graphics: Phaser.GameObjects.Graphics, startX: number, width: number, canvasHeight: number, baseHeight: number, layerIndex: number, mountainColor: number): void {
    const opacity = 0.4 + layerIndex * 0.15 // Match main mountain opacity
    graphics.fillStyle(mountainColor, opacity)
    
    graphics.beginPath()
    graphics.moveTo(startX, canvasHeight)
    
    const segments = 15 // More detail for extensions
    for (let i = 0; i <= segments; i++) {
      const x = startX + (i / segments) * width
      const seed = (x + layerIndex * 1000) * 0.003 // Match main mountain variation
      
      // Generate mountain peaks that stay well below player terrain
      const peakVariation = Math.sin(seed * 1.5) * (60 + layerIndex * 20) + 
                           Math.sin(seed * 4) * (30 + layerIndex * 10) +
                           Math.sin(seed * 10) * (15 + layerIndex * 5)
      
      const mountainHeight = baseHeight + peakVariation
      const y = Math.min(canvasHeight - mountainHeight, 680) // Never go above 680px
      
      graphics.lineTo(x, y)
    }
    
    graphics.lineTo(startX + width, canvasHeight)
    graphics.closePath()
    graphics.fillPath()
  }


  private setupCamera(): void {
    this.camera = this.cameras.main
    this.camera.setSize(GameSettings.canvas.width, GameSettings.canvas.height)
    
    // Set camera zoom to show more of the game world
    this.camera.setZoom(1)
    
    // Set up camera to keep player perfectly centered at all times
    this.camera.startFollow(this.motorcycle, true, 1.0, 1.0) // Instant following - no lag
    this.camera.setFollowOffset(0, 0) // Keep player exactly in center of screen
    
    // Remove all bounds - let camera follow player anywhere
    this.camera.removeBounds()
    
    // No deadzone - follow player immediately and exactly
    this.camera.setDeadzone(0, 0) // Perfect following with no deadzone
    
    // Manually set initial camera position to ensure visibility
    this.camera.centerOn(this.motorcycle.x, this.motorcycle.y)
    
    console.log(`Camera setup: Player at (${this.motorcycle.x}, ${this.motorcycle.y}), Camera at (${this.camera.scrollX}, ${this.camera.scrollY})`)
    console.log("Camera setup with smooth player following")
  }


  private setupManagers(): void {
    // Input manager for infinite runner
    this.inputManager = new InputManager(this)
    this.inputManager.onInputActive = (isActive: boolean) => {
      if (this.gameState === 'playing') {
        this.motorcycle.handleInput(isActive)
      }
    }
    
    this.inputManager.onInputStart = () => {
      if (this.gameState === 'gameOver') {
        this.restartGame()
      }
    }
    
    // Score manager
    this.scoreManager = new ScoreManager(this)
    
    // Setup collision detection for tokens
    this.setupCollisions()
  }

  private setupCollisions(): void {
    // Matter.js collision detection (kept for other potential collisions)
    this.matter.world.on('collisionstart', () => {
      if (this.gameState !== 'playing') return
      // Reserved for future collision handling (terrain, obstacles, etc.)
    })
  }

  private startGame(): void {
    this.gameState = 'playing'
  }

  private gameOver(): void {
    this.gameState = 'gameOver'
    this.scoreManager.showGameOver()
  }

  private restartGame(): void {
    // Reset all systems
    this.scoreManager.reset()
    
    // Reset level generator for infinite terrain first
    if (this.levelGenerator) {
      this.levelGenerator.destroy()
      this.levelGenerator = new LevelGenerator(this)
    }
    
    // Reset motorcycle and update its level generator reference
    this.motorcycle.reset(GameSettings.motorcycle.startX, GameSettings.motorcycle.startY)
    // Make sure motorcycle has the new level generator reference
    this.motorcycle.levelGenerator = this.levelGenerator
    
    // Reset camera
    this.camera.setScroll(0, 0)
    
    // Restart game
    this.gameState = 'playing'
    
    console.log("Game restarted successfully!")
  }

  update(_time: number, deltaTime: number): void {
    if (this.gameState === 'playing') {
      // Update game systems
      this.inputManager.update()
      this.motorcycle.update(deltaTime)
      
      // Keep camera perfectly centered on player - no dynamic adjustments needed
      
      // Always scroll terrain for infinite runner
      this.terrain.update(true)
      
      // Update level generator for infinite terrain chunks
      this.levelGenerator.update(this.camera.scrollX)
      
      // Update infinite parallax mountains
      this.updateParallaxMountains(this.camera.scrollX)
      
      // Manual token collection check (since Matter.js sensor events aren't working)
      this.checkTokenCollisions()
      
      this.scoreManager.update()
    }
  }


  private collisionCheckCounter: number = 0

  private checkTokenCollisions(): void {
    // Only check collisions every 5 frames to improve performance
    this.collisionCheckCounter++
    if (this.collisionCheckCounter % 5 !== 0) return
    
    const motorcycleX = this.motorcycle.x
    const motorcycleY = this.motorcycle.y
    const collectionRadius = 50
    const collectionRadiusSquared = collectionRadius * collectionRadius
    
    // Only check tokens that are roughly on screen
    const cameraLeft = this.camera.scrollX - 100
    const cameraRight = this.camera.scrollX + this.camera.width + 100
    
    // Get all tokens from level generator
    const tokens = this.levelGenerator.getTokens()
    
    // Only check tokens that are roughly visible and nearby
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      
      // Skip if already collected or not visible
      if (token.isCollected || token.x < cameraLeft || token.x > cameraRight) {
        continue
      }
      
      // Quick distance check using squared distance (faster than sqrt)
      const dx = token.x - motorcycleX
      const dy = token.y - motorcycleY
      const distanceSquared = dx * dx + dy * dy
      
      if (distanceSquared <= collectionRadiusSquared) {
        token.collect()
        this.scoreManager.addToken()
        break // Only collect one token per frame to reduce processing
      }
    }
  }

  // --- Scene Shutdown Logic ---
  shutdown(): void {
    if (this.inputManager) {
      this.inputManager.destroy()
    }
    if (this.scoreManager) {
      this.scoreManager.destroy()
    }
    if (this.terrain) {
      this.terrain.destroy()
    }
    if (this.levelGenerator) {
      this.levelGenerator.destroy()
    }
  }
}
