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
  
  // Parallax background layers with infinite generation
  private parallaxLayers: { graphics: Phaser.GameObjects.Graphics, scrollFactor: number, layerIndex: number, color: number, lastX: number }[] = []

  constructor() {
    super({ key: "GameScene" })
  }

  preload(): void {
    // Load player images
    this.load.image('player', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/Riding%20image-hkOurseDcYE6YvgDWvYoQ16cgzxM01.png?j9V4')
    this.load.image('player_flipping', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/Flipping-yCElSe7lSawCKvFuduGGAf9HmQ0O17.png?Ncwo')
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
      
      // Update infinite parallax mountains
      this.updateParallaxMountains(this.camera.scrollX)
      
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
  }
}
