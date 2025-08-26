import GameSettings from "../config/GameSettings"
import { Motorcycle } from "../objects/Motorcycle"
import { DynamicTerrain } from "../systems/DynamicTerrain"
import { LevelGenerator } from "../systems/LevelGenerator"
import { InputManager } from "../systems/InputManager"
import { ScoreManager } from "../systems/ScoreManager"
import { Rail } from "../objects/Rail"
import { GameObjectPools } from "../systems/ObjectPool"

export class GameScene extends Phaser.Scene {
  private motorcycle!: Motorcycle
  private terrain!: DynamicTerrain
  private levelGenerator!: LevelGenerator
  private inputManager!: InputManager
  private scoreManager!: ScoreManager
  private objectPools!: GameObjectPools
  
  private camera!: Phaser.Cameras.Scene2D.Camera
  private gameState: 'playing' | 'gameOver' = 'playing'
  
  // Parallax background layers with infinite mixed images
  private parallaxLayers: { container: Phaser.GameObjects.Container, scrollFactor: number, layerIndex: number, lastExtendX: number }[] = []
  private mountainImages = ['low-mountainscape', 'one-peak', 'two-peaks', 'higher-mountainscape']
  private grassTile!: Phaser.GameObjects.TileSprite
  private backgroundTile!: Phaser.GameObjects.TileSprite

  constructor() {
    super({ key: "GameScene" })
  }

  preload(): void {
    // Load player images
    this.load.image('player', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/Riding%20image-hkOurseDcYE6YvgDWvYoQ16cgzxM01.png?j9V4')
    this.load.image('player_flipping', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/Flipping-yCElSe7lSawCKvFuduGGAf9HmQ0O17.png?Ncwo')
    
    // Load mountain background images for parallax
    this.load.image('low-mountainscape', 'assets/images/mountains/low-mountainscape.png')
    this.load.image('one-peak', 'assets/images/mountains/one-peak.png')
    this.load.image('two-peaks', 'assets/images/mountains/two-peaks.png')
    this.load.image('higher-mountainscape', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/Higher%20mouintan%20scape-PvVImg9WQmSVri4OwNfJc6m4GjvVi2.png?VZGv')
    
    // Load grass ground texture
    this.load.image('grass', 'assets/images/grass.png')
    
    // Load static background image (furthest layer)
    this.load.image('background', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/Snow%20Background-KfEe8V5zyq6R8WytKn6B5VKt6f67Ui.png?G00d')
    
    // Load custom font
    this.load.font('pressStart2P', 'assets/fonts/Press_Start_2P/PressStart2P-Regular.ttf')
  }

  create(): void {
    // Create snow particle texture first
    this.createSnowParticleTexture()
    
    this.createGameObjects()
    this.setupCamera()
    this.setupManagers()
    
    this.startGame()
  }

  private createGameObjects(): void {
    // Create Alto's Odyssey style background
    this.createBackground()
    
    // Create object pools for performance optimization
    this.objectPools = new GameObjectPools(this)
    
    // Create dynamic terrain
    this.terrain = new DynamicTerrain(this, GameSettings.level.groundY, GameSettings.canvas.width)
    
    // Create level generator for infinite terrain chunks
    this.levelGenerator = new LevelGenerator(this, this.objectPools)

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

    this.motorcycle.onGrindStart = () => {
      console.log("Started grinding bonus!")
      this.scoreManager.startGrindDisplay()
    }

    this.motorcycle.onGrindEnd = (grindTime: number, grindScore: number) => {
      console.log(`Grind bonus completed! Time: ${grindTime.toFixed(2)}s, Score: ${grindScore}`)
      this.scoreManager.endGrindDisplay(grindScore, grindTime)
    }
    
    // DEBUG: Create a test rail that player should definitely hit
    this.time.delayedCall(2000, () => {
      console.log("🔴 Creating immediate test rail at player position!")
      const testRail = new Rail(this, this.motorcycle.x + 100, this.motorcycle.y)
      console.log(`🔴 Test rail created at (${this.motorcycle.x + 100}, ${this.motorcycle.y})`)
    })
  }

  private createBackground(): void {
    // Create repeating background image as the very back layer
    this.createRepeatingBackground()
    
    // Add grass ground layer below mountains
    this.createGrassGround()
    
    // Add solid ground base below grass to prevent empty space on high jumps
    this.createGroundBase()
    
    // Initialize image-based parallax mountain system
    this.initializeImageParallaxMountains()
  }

  private createRepeatingBackground(): void {
    // Create static background image that fills the entire screen and follows the camera
    const backgroundImage = this.add.image(
      GameSettings.canvas.width / 2, // Center X
      GameSettings.canvas.height / 2, // Center Y
      'background'
    )
    
    // Scale to fill entire screen
    const scaleX = GameSettings.canvas.width / backgroundImage.width
    const scaleY = GameSettings.canvas.height / backgroundImage.height
    const scale = Math.max(scaleX, scaleY) // Use larger scale to ensure full coverage
    
    backgroundImage.setScale(scale)
    backgroundImage.setDepth(-110) // Furthest back layer, behind absolutely everything
    backgroundImage.setScrollFactor(0) // No parallax - stays fixed to camera/screen
    
    // Store reference (though we won't need to update it)
    this.backgroundTile = backgroundImage as any
    
    console.log('🌌 Created static background image that follows camera')
  }

  private createGrassGround(): void {
    // Create infinite tiling grass ground below mountains
    const grassTile = this.add.tileSprite(
      0, 
      GameSettings.canvas.height - 50, // Position just below screen bottom
      GameSettings.canvas.width * 20, // Very wide for infinite coverage
      200, // 200px tall grass layer
      'grass'
    )
    
    grassTile.setOrigin(0, 0)
    grassTile.setDepth(-88) // Above solid ground base, below mountains
    grassTile.setScrollFactor(0.05) // Slight parallax movement
    grassTile.setAlpha(0.9) // Slightly transparent to blend naturally
    
    // Store reference for infinite scrolling updates
    this.grassTile = grassTile
    
    console.log('🌱 Created grass ground layer below mountains')
  }

  private createGroundBase(): void {
    // Create a solid ground base that extends well below the screen
    // This prevents empty space when jumping high
    const groundGraphics = this.add.graphics()
    
    // Earth/mountain base color - brownish gray
    groundGraphics.fillStyle(0x3C3C3C, 0.8) // Dark gray with some transparency
    
    // Create a very wide and tall ground base
    const groundWidth = GameSettings.canvas.width * 30
    const groundHeight = 400 // Extends 400px below screen bottom
    
    groundGraphics.fillRect(0, GameSettings.canvas.height + 150, groundWidth, groundHeight) // Position below grass
    groundGraphics.setDepth(-90) // Behind everything
    groundGraphics.setScrollFactor(0.02) // Very slight parallax movement
    
    console.log('🌍 Created ground base to prevent empty space on high jumps')
  }

  private updateGrassGround(cameraX: number): void {
    if (this.grassTile) {
      // Update grass tile position for infinite scrolling
      const virtualCameraX = cameraX * this.grassTile.scrollFactorX
      
      // Update the tile position for seamless grass texture scrolling
      this.grassTile.tilePositionX = virtualCameraX * 0.3 // Slower tile movement for natural look
      
      // Keep the grass positioned to always cover the visible area
      this.grassTile.x = cameraX - (GameSettings.canvas.width * 2)
    }
  }

  // Background is now static and follows camera automatically - no update needed

  private createInfiniteRandomMountainLayer(layerIndex: number, depth: number, scrollFactor: number, baseScale: number, yRange: [number, number]): void {
    // Create a container to hold multiple random mountain sprites
    const container = this.add.container(0, 0)
    container.setDepth(depth)
    container.setScrollFactor(scrollFactor)
    
    // Atmospheric perspective settings - Fully opaque mountains
    const alpha = 1.0 // Completely opaque for all layers
    const blueTint = 1.0 - (layerIndex * 0.05) // Very subtle blue tint for distant mountains
    
    // Generate initial mountain segments across a wide area with MASSIVE mountain density
    const segmentWidth = 200 // Much smaller segments for WAY more mountains
    const totalWidth = GameSettings.canvas.width * 20 // Even wider initial coverage
    const numSegments = Math.ceil(totalWidth / segmentWidth)
    
    for (let i = 0; i < numSegments; i++) {
      // Place mountains in only 12% of segments for very sparse, distant look
      if (Math.random() < 0.12) {
        this.addRandomMountainSegment(container, i * segmentWidth, layerIndex, baseScale, yRange, alpha, blueTint)
      }
    }
    
    console.log(`🏔️ Created infinite mountain layer ${layerIndex}: ${numSegments} segments, scale=${baseScale}, alpha=${alpha}`)
    
    this.parallaxLayers.push({ 
      container, 
      scrollFactor, 
      layerIndex, 
      lastExtendX: numSegments * segmentWidth 
    })
  }






  private initializeImageParallaxMountains(): void {
    // Create 5 parallax mountain layers with MUCH more visible mountains
    const layerConfigs = [
      { depth: -85, scrollFactor: 0.05, baseScale: 1.5, yRange: [1075, 1125] as [number, number] },   // Far mountains (smaller)
      { depth: -80, scrollFactor: 0.1, baseScale: 1.3, yRange: [1105, 1155] as [number, number] },  // Large far mountains (smaller)
      { depth: -75, scrollFactor: 0.2, baseScale: 1.2, yRange: [1145, 1195] as [number, number] }, // Mid mountains (smaller)
      { depth: -70, scrollFactor: 0.3, baseScale: 1.1, yRange: [1175, 1225] as [number, number] }, // Medium mountains (smaller)
      { depth: -65, scrollFactor: 0.4, baseScale: 1.0, yRange: [1205, 1255] as [number, number] }  // Close mountains
    ]

    layerConfigs.forEach((config, index) => {
      this.createInfiniteRandomMountainLayer(index, config.depth, config.scrollFactor, config.baseScale, config.yRange)
    })
  }

  private updateParallaxMountains(cameraX: number): void {
    // Update infinite random mountain layers
    this.parallaxLayers.forEach(layer => {
      const virtualCameraX = cameraX * layer.scrollFactor
      
      // Check if we need to extend this layer - extend MUCH earlier
      const cameraRightEdge = virtualCameraX + (GameSettings.canvas.width * 4) // Look further ahead
      
      if (cameraRightEdge > layer.lastExtendX - 2000) { // Extend much earlier
        this.extendRandomMountainLayer(layer)
      }
      
      // Position container to follow camera
      layer.container.x = -virtualCameraX + (GameSettings.canvas.width * 0.5)
      
      // Clean up old mountain segments that are far behind camera
      this.cleanupOldMountainSegments(layer, virtualCameraX)
    })
  }

  private addRandomMountainSegment(container: Phaser.GameObjects.Container, x: number, layerIndex: number, baseScale: number, yRange: [number, number], alpha: number, blueTint: number): void {
    // Choose mountain type based on layer for proper depth perception
    let imageKey: string
    if (layerIndex === 0) {
      // Far layer (background): Use tall peaks and higher mountainscape for distant mountains
      const rand = Math.random()
      if (rand < 0.3) imageKey = 'higher-mountainscape'
      else if (rand < 0.65) imageKey = 'one-peak'
      else imageKey = 'two-peaks'
    } else if (layerIndex === 1) {
      // Mid layer: Mix of all mountain types
      const rand = Math.random()
      if (rand < 0.25) imageKey = 'higher-mountainscape'
      else if (rand < 0.45) imageKey = 'low-mountainscape'
      else if (rand < 0.7) imageKey = 'one-peak'
      else imageKey = 'two-peaks'
    } else {
      // Close layers: Primarily low-mountainscape with some variety
      const rand = Math.random()
      if (rand < 0.6) imageKey = 'low-mountainscape'
      else if (rand < 0.75) imageKey = 'one-peak'
      else if (rand < 0.9) imageKey = 'two-peaks'
      else imageKey = 'higher-mountainscape'
    }
    
    // Add random variations - less extreme for cleaner look
    const scaleVariation = 0.8 + (Math.random() * 0.4) // 0.8x to 1.2x scale variation (less extreme)
    const finalScale = baseScale * scaleVariation
    
    // Random vertical positioning within range
    const yOffset = yRange[0] + (Math.random() * (yRange[1] - yRange[0]))
    const yPos = yOffset // Direct positioning - higher yRange = lower on screen
    
    // Random horizontal flipping (50% chance)
    const flipX = Math.random() > 0.5
    
    // Create mountain sprite
    const mountain = this.add.image(x, yPos, imageKey)
    mountain.setOrigin(0, 1) // Bottom-left origin
    mountain.setScale(finalScale * (flipX ? -1 : 1), finalScale) // Handle flipping
    mountain.setAlpha(alpha)
    
    // Apply atmospheric blue tint
    const tintColor = Phaser.Display.Color.GetColor(
      Math.floor(blueTint * 255), 
      Math.floor(blueTint * 255), 
      255
    )
    mountain.setTint(tintColor)
    
    // Add to container
    container.add(mountain)
    
    // Store metadata for cleanup
    ;(mountain as any).segmentX = x
  }

  private extendRandomMountainLayer(layer: { container: Phaser.GameObjects.Container, scrollFactor: number, layerIndex: number, lastExtendX: number }): void {
    const segmentWidth = 200 // Match the smaller segment width
    const numNewSegments = 20 // Add TONS more segments at once
    
    const layerConfigs = [
      { baseScale: 1.5, yRange: [1075, 1125] as [number, number] },   // Far mountains (smaller)
      { baseScale: 1.3, yRange: [1105, 1155] as [number, number] },  // Large far mountains (smaller)
      { baseScale: 1.2, yRange: [1145, 1195] as [number, number] }, // Mid mountains (smaller)
      { baseScale: 1.1, yRange: [1175, 1225] as [number, number] }, // Medium mountains (smaller)
      { baseScale: 1.0, yRange: [1205, 1255] as [number, number] }  // Close mountains
    ]
    
    const config = layerConfigs[layer.layerIndex] || layerConfigs[0] // Fallback to first config
    const alpha = 1.0 // Completely opaque for all layers
    const blueTint = 1.0 - (layer.layerIndex * 0.05) // Match the tint settings
    
    for (let i = 0; i < numNewSegments; i++) {
      const x = layer.lastExtendX + (i * segmentWidth)
      
      // 12% density - very sparse mountains for distant background effect
      if (Math.random() < 0.12) {
        this.addRandomMountainSegment(
          layer.container, 
          x, 
          layer.layerIndex, 
          config.baseScale, 
          config.yRange, 
          alpha, 
          blueTint
        )
      }
    }
    
    layer.lastExtendX += numNewSegments * segmentWidth
    
    // Always log extensions to track infinite generation
    console.log(`🏔️ Extended mountain layer ${layer.layerIndex} to ${layer.lastExtendX}px (camera at ${Math.floor(layer.lastExtendX * layer.scrollFactor)})`)
  }

  private cleanupOldMountainSegments(layer: { container: Phaser.GameObjects.Container, scrollFactor: number, layerIndex: number, lastExtendX: number }, virtualCameraX: number): void {
    const cleanupDistance = GameSettings.canvas.width * 6 // Keep more segments for safety
    const cleanupThreshold = virtualCameraX - cleanupDistance
    
    // Find and remove old segments
    const children = layer.container.list.slice() // Copy array to avoid modification during iteration
    let removedCount = 0
    
    children.forEach(child => {
      const mountain = child as Phaser.GameObjects.Image
      const segmentX = (mountain as any).segmentX || 0
      
      if (segmentX < cleanupThreshold) {
        layer.container.remove(mountain)
        mountain.destroy()
        removedCount++
      }
    })
    
    if (removedCount > 0 && Math.random() < 0.1) { // 10% chance to log cleanup
      console.log(`🧼 Cleaned up ${removedCount} old mountain segments from layer ${layer.layerIndex}`)
    }
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

  private createSnowParticleTexture(): void {
    // Create a simple white circle texture for snow particles
    const graphics = this.add.graphics()
    graphics.fillStyle(0xFFFFFF, 1)
    graphics.fillCircle(3, 3, 3)
    graphics.generateTexture('snow-particle', 6, 6)
    graphics.destroy()
    
    console.log("Snow particle texture created")
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
    console.log("🔧 Setting up collision detection for rails and tokens")
    
    // Set up collision event handlers for one-way platforms
    this.matter.world.on('collisionstart', this.handleCollisionStart.bind(this))
  }

  private handleCollisionStart(event: any): void {
    console.log("🔍 COLLISION EVENT:", event.pairs?.length || 0, "pairs detected")
    
    // DEBUG: Log ALL collision pairs to see what's actually colliding
    if (event.pairs) {
      for (let i = 0; i < event.pairs.length; i++) {
        const pair = event.pairs[i]
        console.log(`  Pair ${i}: ${pair.bodyA.label} vs ${pair.bodyB.label}`)
      }
    }
    
    for (const pair of event.pairs) {
      const bodyA = pair.bodyA
      const bodyB = pair.bodyB
      
      console.log("🔍 COLLISION PAIR:", bodyA.label, "vs", bodyB.label)
      
      // Check if this is a player-rail collision
      let playerBody = null
      let railBody = null
      
      if (bodyA.label === 'motorcycle' && bodyB.label === 'rail') {
        playerBody = bodyA
        railBody = bodyB
        console.log("🔍 PLAYER-RAIL COLLISION DETECTED (A=player, B=rail)")
      } else if (bodyB.label === 'motorcycle' && bodyA.label === 'rail') {
        playerBody = bodyB
        railBody = bodyA
        console.log("🔍 PLAYER-RAIL COLLISION DETECTED (B=player, A=rail)")
      }
      
      if (playerBody && railBody) {
        const playerBottom = playerBody.position.y + 15 // Player's bottom edge (adjusted)
        const railTop = railBody.position.y - 7 // Rail's top edge (adjusted)
        const verticalDistance = playerBottom - railTop
        
        console.log("🔍 DETAILED RAIL COLLISION ANALYSIS:")
        console.log("  - Rail isOneWayPlatform:", (railBody as any).isOneWayPlatform)
        console.log("  - Rail isSensor before:", railBody.isSensor)
        console.log("  - Player position:", playerBody.position.x.toFixed(0), playerBody.position.y.toFixed(0))
        console.log("  - Rail position:", railBody.position.x.toFixed(0), railBody.position.y.toFixed(0))
        console.log("  - Player velocity:", playerBody.velocity.x.toFixed(1), playerBody.velocity.y.toFixed(1))
        console.log("  - Player bottom edge:", playerBottom.toFixed(1))
        console.log("  - Rail top edge:", railTop.toFixed(1))
        console.log("  - Vertical distance:", verticalDistance.toFixed(1))
        console.log("  - Player above rail?", playerBottom < railTop)
        console.log("  - Player below rail?", playerBottom > railTop + 10)
        console.log("  - Player moving up?", playerBody.velocity.y < -50) // More strict upward check
        console.log("  - Player moving down?", playerBody.velocity.y > 50) // Check for downward landing
        
        if ((railBody as any).isOneWayPlatform) {
          // COMPREHENSIVE ONE-WAY COLLISION DEBUGGING
          const playerVelY = playerBody.velocity.y
          const playerPosY = playerBody.position.y
          const railPosY = railBody.position.y
          const isMovingDown = playerVelY > 10 // Player falling/landing (positive Y = down)
          const isMovingUp = playerVelY < -10 // Player jumping up (negative Y = up)
          const isPlayerAboveRail = playerPosY < railPosY // Player center above rail center
          const verticalDistance = Math.abs(playerPosY - railPosY)
          
          console.log("🔍 COMPREHENSIVE ONE-WAY COLLISION ANALYSIS:")
          console.log("  - Player Y pos:", playerPosY.toFixed(1))
          console.log("  - Rail Y pos:", railPosY.toFixed(1))
          console.log("  - Player velocity Y:", playerVelY.toFixed(1))
          console.log("  - Vertical distance:", verticalDistance.toFixed(1))
          console.log("  - Player above rail?", isPlayerAboveRail)
          console.log("  - Moving down (falling)?", isMovingDown, "(vel > 10)")
          console.log("  - Moving up (jumping)?", isMovingUp, "(vel < -10)")
          console.log("  - Rail current isSensor:", railBody.isSensor)
          
          // DECISION MATRIX
          if (isMovingDown && isPlayerAboveRail) {
            // Case 1: Player falling down from above - should land on rail
            railBody.isSensor = false
            console.log("🟢 CASE 1: LANDING - Rail made SOLID (player falling from above)")
          } else if (isMovingUp) {
            // Case 2: Player jumping up - should pass through rail
            railBody.isSensor = true
            console.log("🟡 CASE 2: JUMPING UP - Rail made SENSOR (player jumping up)")
            
            // Restore to solid after jump passes through
            setTimeout(() => {
              if (railBody && railBody.isSensor) {
                railBody.isSensor = false
                console.log("🔄 Post-jump: Rail restored to solid")
              }
            }, 150)
          } else if (!isPlayerAboveRail && !isMovingUp) {
            // Case 3: Player below rail moving horizontally - should pass through
            railBody.isSensor = true
            console.log("🟡 CASE 3: BELOW RAIL - Rail made SENSOR (player below rail)")
          } else {
            // Case 4: Default/unclear situation
            const shouldBeSolid = isPlayerAboveRail
            railBody.isSensor = !shouldBeSolid
            console.log(`🟠 CASE 4: DEFAULT - Rail made ${shouldBeSolid ? 'SOLID' : 'SENSOR'} (player above: ${isPlayerAboveRail})`)
          }
          
          console.log("  - Rail final state: isSensor =", railBody.isSensor)
          console.log("  - Expected result:", railBody.isSensor ? "PASS THROUGH" : "SOLID COLLISION")
        }
      }
    }
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
      this.levelGenerator = new LevelGenerator(this, this.objectPools)
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
      
      // Update infinite parallax mountains and grass (background is static)
      this.updateParallaxMountains(this.camera.scrollX)
      this.updateGrassGround(this.camera.scrollX)
      
      // Manual token collection check (since Matter.js sensor events aren't working)
      this.checkTokenCollisions()
      
      // Manual rail collision check
      this.checkRailCollisions()
      
      this.scoreManager.update()
    }
  }


  private collisionCheckCounter: number = 0

  private checkRailCollisions(): void {
    const motorcycleX = this.motorcycle.x
    const motorcycleY = this.motorcycle.y
    const collisionRadius = 60 // Large radius for easy testing
    const collisionRadiusSquared = collisionRadius * collisionRadius
    
    // Get all rails from level generator
    const rails = this.levelGenerator.getRails()
    
    // DEBUG: Always show rail status
    if (rails.length > 0) {
      const railPositions = rails.map((r, i) => `Rail${i}:(${r.x.toFixed(0)},${r.y.toFixed(0)})`).join(' ')
      console.log(`🔍 RAIL STATUS: ${rails.length} rails, Player:(${motorcycleX.toFixed(0)},${motorcycleY.toFixed(0)}) ${railPositions}`)
    } else {
      console.log(`🔍 NO RAILS FOUND - Player:(${motorcycleX.toFixed(0)},${motorcycleY.toFixed(0)})`)
    }
    
    let isCurrentlyOnRail = false
    
    // Check each rail for grinding collision - SIMPLIFIED FOR PERFORMANCE
    for (let i = 0; i < rails.length; i++) {
      const rail = rails[i]
      const dx = rail.x - motorcycleX
      const dy = rail.y - motorcycleY
      const horizontalDistance = Math.abs(dx)
      const verticalDistance = Math.abs(dy)
      
      // Player's vertical position relative to rail (negative = above rail)
      const verticalOffset = motorcycleY - rail.y
      const playerVelY = this.motorcycle.body?.velocity?.y || 0
      
      // EXTREMELY GENEROUS thresholds for debugging
      const horizontalThreshold = 200 // Very wide detection
      const verticalThreshold = 150   // Very tall detection
      
      // SIMPLIFIED RAIL DETECTION: One clear method
      const withinHorizontalRange = horizontalDistance <= horizontalThreshold
      const withinVerticalRange = verticalDistance <= verticalThreshold
      
      // Re-enable velocity check with reasonable limits after velocity fix
      const reasonableVelocity = Math.abs(this.motorcycle.getVelocity().x) < 1500 // 50% over GameSettings maxSpeed
      const validForGrinding = Math.abs(verticalOffset) <= 200 && reasonableVelocity
      
      // DEBUG: Show all detection attempts for rails we're close to
      if (horizontalDistance <= 150) { // Show if we're reasonably close
        console.log(`🔍 RAIL ${i} CHECK: H:${horizontalDistance.toFixed(1)}/${horizontalThreshold}=${withinHorizontalRange} V:${verticalDistance.toFixed(1)}/${verticalThreshold}=${withinVerticalRange} vel:${this.motorcycle.getVelocity().x.toFixed(1)} reasonable:${reasonableVelocity} validGrind:${validForGrinding}`)
        if (!validForGrinding) {
          console.log(`  - Invalid because: offset=${Math.abs(verticalOffset).toFixed(1)}>200? ${Math.abs(verticalOffset) > 200} vel=${this.motorcycle.getVelocity().x.toFixed(1)}>1500? ${!reasonableVelocity}`)
        }
      }
      
      // IMPROVED: Simple but reliable rail detection
      if (withinHorizontalRange && withinVerticalRange && validForGrinding) {
        console.log(`🟢 RAIL CONTACT: Player touching rail ${i}`)
        isCurrentlyOnRail = true
        
        // Start grinding if not already grinding
        if (!this.motorcycle.isGrinding) {
          console.log(`🟢 STARTING GRIND on rail ${i}`)
          this.motorcycle.startGrinding(rail)
        } else if (this.motorcycle.currentRail !== rail) {
          // Switch to new rail if we're already grinding a different one
          console.log(`🟢 SWITCHING RAILS from rail to rail ${i}`)
          this.motorcycle.stopGrinding()
          this.motorcycle.startGrinding(rail)
        }
        break // Only grind one rail at a time
      }
    }
    
    // STICKY RAIL GRINDING: Only stop if player manually jumps or goes WAY off rail
    if (!isCurrentlyOnRail && this.motorcycle.isGrinding) {
      // Check if player is still within reasonable range of their current rail
      if (this.motorcycle.currentRail) {
        const railDx = Math.abs(this.motorcycle.x - this.motorcycle.currentRail.x)
        const railWidth = 300 // Rail is 300px wide
        const railHalfWidth = railWidth / 2
        
        // MUCH MORE LENIENT: Only stop if player is REALLY far from the rail
        const veryFarFromRail = railDx > railHalfWidth + 100 // 100px buffer beyond rail edge
        
        // Check grind duration but be more lenient
        const grindDuration = Date.now() - (this.motorcycle as any).grindStartTime
        const hasBeenGrindingAWhile = grindDuration > 200 // 200ms minimum
        
        // Only stop if player is very far AND has been grinding for a reasonable time
        if (veryFarFromRail && hasBeenGrindingAWhile) {
          console.log(`🔴 RAIL FAR EXIT: Player very far from rail (${railDx.toFixed(1)} > ${railHalfWidth + 100}) after ${grindDuration}ms`)
          this.motorcycle.stopGrinding()
        } else {
          // Keep grinding - player is still close enough to the rail
          if (Math.random() < 0.1) { // 10% chance to log
            console.log(`🟡 STAYING ON RAIL: distance:${railDx.toFixed(1)}/${railHalfWidth + 100} duration:${grindDuration}ms`)
          }
        }
      } else {
        console.log("🔴 Manual grind end - no current rail")
        this.motorcycle.stopGrinding()
      }
    }
    
    console.log("🔍 RAIL CHECK END - isCurrentlyOnRail:", isCurrentlyOnRail)
  }

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
        
        // Return collected token to pool and remove from level generator
        this.objectPools.tokenPool.release(token)
        this.levelGenerator.removeToken(token)
        
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
    
    // Clean up parallax layers and grass
    this.parallaxLayers.forEach(layer => {
      if (layer.container) {
        layer.container.destroy(true) // Destroy container and all children
      }
    })
    this.parallaxLayers = []
    
    if (this.grassTile) {
      this.grassTile.destroy()
    }
    
    if (this.backgroundTile) {
      this.backgroundTile.destroy()
    }
  }
}
