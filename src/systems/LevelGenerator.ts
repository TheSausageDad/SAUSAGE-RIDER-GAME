import GameSettings from "../config/GameSettings"
import { Token } from "../objects/Token"
import { Spike } from "../objects/Spike"
import { MovingPlatform } from "../objects/MovingPlatform"

export interface LevelChunk {
  x: number
  width: number
  ground: Phaser.GameObjects.GameObject[]
  ramps: Phaser.GameObjects.Graphics[]
  tokens: Token[]
  spikes: Spike[]
  platforms: MovingPlatform[]
  terrainPath: { x: number, y: number }[] // Store terrain points for smooth physics
}

export class LevelGenerator {
  private scene: Phaser.Scene
  private chunks: LevelChunk[] = []
  private nextChunkX: number = 0
  private chunkPool: LevelChunk[] = []
  private lastChunkEndHeight: number = GameSettings.level.groundY
  private lastChunkEndAngle: number = 0
  
  // Extended terrain generation state
  private currentTerrainType: string | null = null
  private terrainProgress: number = 0
  private terrainLength: number = 0
  private targetHeight: number = GameSettings.level.groundY

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.generateInitialChunks()
  }

  private generateInitialChunks(): void {
    // Set starting position WAY higher up for epic downhill start
    this.lastChunkEndHeight = GameSettings.level.groundY - 500 // Start 500px above ground level
    this.lastChunkEndAngle = 0
    
    // Generate multiple starting downhill chunks for long epic descent
    this.generateChunk(0, true) // First downhill chunk
    this.generateChunk(this.nextChunkX, true) // Second downhill chunk
    this.generateChunk(this.nextChunkX, true) // Third downhill chunk
    this.generateChunk(this.nextChunkX, true) // Fourth downhill chunk
    
    // Generate several more chunks ahead normally
    for (let i = 4; i < 8; i++) {
      this.generateChunk(this.nextChunkX)
    }
  }

  private generateChunk(x: number, isStarting: boolean = false): LevelChunk {
    const chunkWidth = GameSettings.level.chunkWidth
    const chunk: LevelChunk = {
      x,
      width: chunkWidth,
      ground: [],
      ramps: [],
      tokens: [],
      spikes: [],
      platforms: [],
      terrainPath: []
    }

    if (isStarting) {
      // Starting chunk: create a nice downhill slope for immediate speed
      this.createStartingDownhill(chunk, x, chunkWidth)
    } else {
      // Random terrain generation that connects seamlessly
      this.generateTerrainForChunk(chunk, x, chunkWidth)
    }

    // Add obstacles and collectibles
    if (!isStarting) {
      this.addObstacles(chunk)
      this.addTokens(chunk)
    }

    this.chunks.push(chunk)
    this.nextChunkX = x + chunkWidth
    
    return chunk
  }

  private createStartingDownhill(chunk: LevelChunk, x: number, width: number): void {
    const startHeight = this.lastChunkEndHeight
    
    // Calculate which chunk this is (0-3) to create progressive descent
    const chunkIndex = Math.floor(x / width)
    let endHeight: number
    
    if (chunkIndex === 0) {
      // First chunk: gradual start from 500px above to 350px above
      endHeight = GameSettings.level.groundY - 350
    } else if (chunkIndex === 1) {
      // Second chunk: steeper descent from 350px to 150px above
      endHeight = GameSettings.level.groundY - 150
    } else if (chunkIndex === 2) {
      // Third chunk: continue descent from 150px to 50px below ground
      endHeight = GameSettings.level.groundY + 50
    } else {
      // Fourth chunk: final descent to 100px below ground
      endHeight = GameSettings.level.groundY + 100
    }
    
    // Create smooth downhill path for epic long descent
    const pathPoints = []
    const numPoints = 25 // More points for smoother long descent
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints
      const pointX = x + (width * progress)
      
      // Smooth curve for natural downhill flow
      const curveProgress = this.easeInOutQuad(progress)
      const pointY = startHeight + (endHeight - startHeight) * curveProgress
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    // Update tracking for next chunk
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    // Create the epic starting downhill terrain
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, 50, 0x32CD32) // Bright green for epic downhill
    
    console.log(`Created epic starting downhill chunk ${chunkIndex}: ${startHeight.toFixed(0)} -> ${endHeight.toFixed(0)}`)
  }

  private createFlatGround(chunk: LevelChunk, x: number, width: number): void {
    const groundHeight = 50
    const startHeight = this.lastChunkEndHeight
    const endHeight = startHeight // Keep flat
    
    console.log(`Creating ground at x: ${x}, startHeight: ${startHeight}, width: ${width}`)
    
    // Create terrain path that connects to previous chunk
    chunk.terrainPath = [
      { x: x, y: startHeight },
      { x: x + width, y: endHeight }
    ]
    
    // Update tracking for next chunk
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = 0
    
    // Visual ground using solid snow white
    const groundGraphics = this.scene.add.graphics()
    groundGraphics.fillStyle(0xF8F8FF, 1.0) // Solid snow white
    groundGraphics.lineStyle(4, 0xE6E6FA, 0.8) // Light lavender outline
    groundGraphics.beginPath()
    groundGraphics.moveTo(x, startHeight)
    groundGraphics.lineTo(x + width, endHeight)
    groundGraphics.lineTo(x + width, GameSettings.canvas.height)
    groundGraphics.lineTo(x, GameSettings.canvas.height)
    groundGraphics.closePath()
    groundGraphics.fillPath()
    groundGraphics.strokePath()
    groundGraphics.setDepth(-1)
    
    // Create physics body that matches the visual exactly
    const centerX = x + width / 2
    const centerY = (startHeight + GameSettings.canvas.height) / 2
    
    const vertices = [
      { x: x - centerX, y: startHeight - centerY },
      { x: (x + width) - centerX, y: endHeight - centerY },
      { x: (x + width) - centerX, y: GameSettings.canvas.height - centerY },
      { x: x - centerX, y: GameSettings.canvas.height - centerY }
    ]
    
    const ground = this.scene.add.polygon(
      centerX, 
      centerY, 
      vertices,
      0x000000, 0 // Invisible - only for physics
    )
    ground.setDepth(-1)
    
    // Add Matter physics and make it static
    this.scene.matter.add.gameObject(ground, { isStatic: true })
    
    chunk.ramps.push(groundGraphics)
    chunk.ground.push(ground)
  }

  private generateTerrainForChunk(chunk: LevelChunk, x: number, width: number): void {
    // Check if we're continuing an extended terrain feature
    if (this.currentTerrainType && this.terrainProgress < this.terrainLength) {
      // Continue the current extended terrain feature
      this.continueExtendedTerrain(chunk, x, width)
      this.terrainProgress++
    } else {
      // Start a new extended terrain feature
      this.startNewExtendedTerrain(chunk, x, width)
    }
  }

  private startNewExtendedTerrain(chunk: LevelChunk, x: number, width: number): void {
    const terrainType = Math.random()
    
    if (terrainType < 0.35) {
      // Epic long downhills (4-8 chunks) - for massive speed building
      this.currentTerrainType = 'epic_downhill'
      this.terrainLength = 4 + Math.floor(Math.random() * 5) // 4-8 chunks (very long downhills)
      this.targetHeight = this.lastChunkEndHeight + 400 + Math.random() * 600 // Go down 400-1000px total (very deep)
      this.targetHeight = Math.min(this.targetHeight, GameSettings.level.groundY + 600) // Allow very deep downhills
    } else if (terrainType < 0.55) {
      // Steep challenging uphills (3-6 chunks) - more exciting climbs
      this.currentTerrainType = 'steep_uphill'
      this.terrainLength = 3 + Math.floor(Math.random() * 4) // 3-6 chunks (longer uphills)
      this.targetHeight = this.lastChunkEndHeight - 250 - Math.random() * 300 // Go up 250-550px total (steeper)
      this.targetHeight = Math.max(this.targetHeight, GameSettings.level.groundY - 500) // Allow higher peaks
    } else if (terrainType < 0.68) {
      // Varied mini slopes (1-2 chunks) - quick elevation changes
      this.currentTerrainType = 'mini_slopes'
      this.terrainLength = 1 + Math.floor(Math.random() * 2) // 1-2 chunks (quick changes)
      this.targetHeight = this.lastChunkEndHeight + (Math.random() - 0.5) * 200 // ±100px changes
    } else if (terrainType < 0.8) {
      // Dramatic rolling terrain (3-5 chunks) - bigger hills and valleys
      this.currentTerrainType = 'dramatic_hills'
      this.terrainLength = 3 + Math.floor(Math.random() * 3) // 3-5 chunks
      this.targetHeight = this.lastChunkEndHeight + (Math.random() - 0.4) * 300 // Slight downward bias but bigger changes
    } else if (terrainType < 0.92) {
      // Massive jump ramps (2-3 chunks) - bigger air opportunities
      this.currentTerrainType = 'massive_jump'
      this.terrainLength = 2 + Math.floor(Math.random() * 2) // 2-3 chunks for bigger ramps
      this.targetHeight = this.lastChunkEndHeight - 220 - Math.random() * 180 // Build up 220-400px for massive jumps
    } else if (terrainType < 0.97) {
      // Speed valleys (2-4 chunks) - deep dips for momentum
      this.currentTerrainType = 'speed_valley'
      this.terrainLength = 2 + Math.floor(Math.random() * 3) // 2-4 chunks
      this.targetHeight = this.lastChunkEndHeight + 200 + Math.random() * 300 // Deep valleys for speed
    } else {
      // Minimal flat sections (1 chunk only) - just for breathing room
      this.currentTerrainType = 'extended_flat'
      this.terrainLength = 1 // Only 1 chunk of flat
      this.targetHeight = this.lastChunkEndHeight // Stay at current height
    }
    
    this.terrainProgress = 0
    this.continueExtendedTerrain(chunk, x, width)
    this.terrainProgress++
  }

  private continueExtendedTerrain(chunk: LevelChunk, x: number, width: number): void {
    // Fix progress calculation - should use actual progress through terrain length
    const progress = Math.min(this.terrainProgress / Math.max(this.terrainLength - 1, 1), 1) // 0 to 1 over the feature length
    
    switch (this.currentTerrainType) {
      case 'epic_downhill':
        this.createEpicDownhill(chunk, x, width, progress)
        break
      case 'steep_uphill':
        this.createSteepUphill(chunk, x, width, progress)
        break
      case 'mini_slopes':
        this.createMiniSlopes(chunk, x, width, progress)
        break
      case 'dramatic_hills':
        this.createDramaticHills(chunk, x, width, progress)
        break
      case 'massive_jump':
        this.createMassiveJump(chunk, x, width, progress)
        break
      case 'speed_valley':
        this.createSpeedValley(chunk, x, width, progress)
        break
      case 'extended_flat':
        this.createExtendedFlat(chunk, x, width, progress)
        break
      // Keep old terrain types for compatibility
      case 'extended_downhill':
        this.createExtendedDownhill(chunk, x, width, progress)
        break
      case 'extended_uphill':
        this.createExtendedUphill(chunk, x, width, progress)
        break
      case 'rolling_hills':
        this.createRollingHills(chunk, x, width, progress)
        break
      case 'jump_ramp':
        this.createJumpRamp(chunk, x, width, progress)
        break
      default:
        this.createFlatGround(chunk, x, width)
        break
    }
    
    // Check if we've completed this terrain feature
    if (this.terrainProgress >= this.terrainLength - 1) {
      this.currentTerrainType = null
      this.terrainProgress = 0
      this.terrainLength = 0
    }
  }


  private createExtendedDownhill(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    
    // Smooth curve from start to target height over multiple chunks
    const smoothProgress = this.easeInOutQuad(progress) // Smooth acceleration/deceleration
    const endHeight = startHeight + (this.targetHeight - startHeight) * smoothProgress
    
    // Create smooth downhill path within this chunk with proper connection
    const pathPoints = []
    const numPoints = 25 // More points for smoother curves
    
    // Ensure first point exactly matches previous chunk end
    pathPoints.push({ x: x, y: startHeight })
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Use smooth curve instead of linear interpolation
      const curveProgress = this.easeInOutQuad(localProgress)
      const pointY = startHeight + (endHeight - startHeight) * curveProgress
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    // Update tracking for next chunk - ensure exact connection
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, 50, 0x9ACD32) // Yellow-green for downhills
  }

  private createExtendedUphill(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    
    // Smooth curve from start to target height over multiple chunks
    const smoothProgress = this.easeInOutQuad(progress)
    const endHeight = startHeight + (this.targetHeight - startHeight) * smoothProgress
    
    // Create smooth uphill path within this chunk with proper connection
    const pathPoints = []
    const numPoints = 25 // More points for smoother curves
    
    // Ensure first point exactly matches previous chunk end
    pathPoints.push({ x: x, y: startHeight })
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Use smooth curve instead of linear interpolation
      const curveProgress = this.easeInOutQuad(localProgress)
      const pointY = startHeight + (endHeight - startHeight) * curveProgress
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    // Update tracking for next chunk - ensure exact connection
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, 50, 0x4682B4) // Steel blue for uphills
  }


  private createRollingHills(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    
    // Create larger, more jump-friendly rolling hills with proper connections
    const pathPoints = []
    const numPoints = 20 // More points for smoother connections
    
    // Ensure first point exactly matches previous chunk end
    pathPoints.push({ x: x, y: startHeight })
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Create larger rolling hills with slower frequency for better jumping
      const globalProgress = progress + (localProgress / this.terrainLength)
      const wave1 = Math.sin(globalProgress * Math.PI * 1.5) * 80 // Larger primary wave, slower frequency
      const wave2 = Math.sin(globalProgress * Math.PI * 3) * 30 // Larger secondary wave
      
      // Blend with start height to ensure smooth connection at chunk boundaries
      const connectionBlend = Math.min(localProgress * 3, 1) // Blend over first 33% of chunk
      const baseHeight = startHeight * (1 - connectionBlend) + (startHeight + wave1 + wave2) * connectionBlend
      
      pathPoints.push({ x: pointX, y: baseHeight })
    }
    
    // Update tracking for next chunk (end of this chunk)
    const endHeight = pathPoints[pathPoints.length - 1].y
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(pathPoints[pathPoints.length - 1].y - pathPoints[pathPoints.length - 2].y, width / numPoints)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, 50, 0xB0E0E6) // Light blue for rolling hills
  }

  private createExtendedFlat(chunk: LevelChunk, x: number, width: number, progress: number): void {
    // Simple flat ground for breathing room
    this.createFlatGround(chunk, x, width)
  }

  private createJumpRamp(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    const endHeight = startHeight + (this.targetHeight - startHeight) * this.easeInOutQuad(progress)
    
    // Create upward ramp for jumping with proper connection
    const pathPoints = []
    const numPoints = 25 // More points for smoother ramps
    
    // Ensure first point exactly matches previous chunk end
    pathPoints.push({ x: x, y: startHeight })
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Use smooth curve for natural ramp feel
      const curveProgress = this.easeInOutQuad(localProgress)
      const pointY = startHeight + (endHeight - startHeight) * curveProgress
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    // Update tracking for next chunk - ensure exact connection
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, 50, 0x6495ED) // Cornflower blue for ramps
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  // New exciting terrain types
  private createEpicDownhill(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    
    // Epic downhills with accelerating curve for maximum speed building
    let curveProgress = progress
    if (progress < 0.3) {
      // Start gentle for natural feel
      curveProgress = progress * 0.5
    } else {
      // Accelerate the descent dramatically
      curveProgress = 0.15 + Math.pow((progress - 0.3) / 0.7, 1.8) * 0.85
    }
    
    const endHeight = startHeight + (this.targetHeight - startHeight) * curveProgress
    
    // Create smooth epic downhill path with extra steepness
    const pathPoints = []
    const numPoints = 30 // Extra smooth for long descents
    
    pathPoints.push({ x: x, y: startHeight })
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Add some natural variation to make it feel more organic
      const variation = Math.sin(localProgress * Math.PI * 3) * 20 * (1 - progress * 0.5)
      const curveProgress = this.easeInOutQuad(localProgress)
      const pointY = startHeight + (endHeight - startHeight) * curveProgress + variation
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, 50, 0xFF6B35) // Orange for epic speed
  }

  private createSteepUphill(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    
    // Steep uphills with challenging but achievable grades
    const smoothProgress = this.easeInOutQuad(progress)
    const endHeight = startHeight + (this.targetHeight - startHeight) * smoothProgress
    
    const pathPoints = []
    const numPoints = 25
    
    pathPoints.push({ x: x, y: startHeight })
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Create challenging but rideable steepness
      let steepnessModifier = 1.0
      if (localProgress > 0.2 && localProgress < 0.8) {
        // Steeper in the middle section
        steepnessModifier = 1.3
      }
      
      const curveProgress = this.easeInOutQuad(localProgress) * steepnessModifier
      const pointY = startHeight + (endHeight - startHeight) * Math.min(curveProgress, 1)
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, 50, 0xFF1744) // Red for challenging uphills
  }

  private createMiniSlopes(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    const endHeight = startHeight + (this.targetHeight - startHeight) * progress
    
    const pathPoints = []
    const numPoints = 20
    
    pathPoints.push({ x: x, y: startHeight })
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Quick, snappy elevation changes with multiple small bumps
      const primarySlope = startHeight + (endHeight - startHeight) * localProgress
      const miniBumps = Math.sin(localProgress * Math.PI * 4) * 30 + 
                       Math.sin(localProgress * Math.PI * 8) * 15
      
      const pointY = primarySlope + miniBumps
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, 50, 0x8BC34A) // Light green for mini slopes
  }

  private createDramaticHills(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    
    const pathPoints = []
    const numPoints = 35
    
    pathPoints.push({ x: x, y: startHeight })
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Create dramatic landscape with multiple frequency waves
      const globalProgress = progress + (localProgress / this.terrainLength)
      const wave1 = Math.sin(globalProgress * Math.PI * 1.2) * 120 // Large primary hills
      const wave2 = Math.sin(globalProgress * Math.PI * 2.8) * 60  // Medium secondary hills
      const wave3 = Math.sin(globalProgress * Math.PI * 6) * 25    // Small detail bumps
      
      // Blend with connection to ensure smooth chunk boundaries
      const connectionBlend = Math.min(localProgress * 2, 1)
      const dramaticHeight = startHeight + wave1 + wave2 + wave3
      const blendedHeight = startHeight * (1 - connectionBlend) + dramaticHeight * connectionBlend
      
      pathPoints.push({ x: pointX, y: blendedHeight })
    }
    
    const endHeight = pathPoints[pathPoints.length - 1].y
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(pathPoints[pathPoints.length - 1].y - pathPoints[pathPoints.length - 2].y, width / numPoints)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, 50, 0x9C27B0) // Purple for dramatic terrain
  }

  private createMassiveJump(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    const endHeight = startHeight + (this.targetHeight - startHeight) * this.easeInOutQuad(progress)
    
    const pathPoints = []
    const numPoints = 30
    
    pathPoints.push({ x: x, y: startHeight })
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      let pointY = startHeight
      
      if (localProgress < 0.2) {
        // Gentle approach
        const approachProgress = localProgress / 0.2
        pointY = startHeight + (endHeight - startHeight) * 0.1 * approachProgress
      } else if (localProgress < 0.85) {
        // Massive ramp buildup
        const rampProgress = (localProgress - 0.2) / 0.65
        const rampCurve = Math.pow(rampProgress, 0.7) // Slightly concave for better launch feel
        pointY = startHeight + (endHeight - startHeight) * (0.1 + 0.85 * rampCurve)
      } else {
        // Launch platform - slightly upward for perfect takeoff angle
        const launchProgress = (localProgress - 0.85) / 0.15
        const launchBoost = Math.sin(launchProgress * Math.PI) * 30 // Small upward boost at end
        pointY = startHeight + (endHeight - startHeight) * 0.95 - launchBoost
      }
      
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    this.lastChunkEndHeight = pathPoints[pathPoints.length - 1].y
    this.lastChunkEndAngle = Math.atan2(pathPoints[pathPoints.length - 1].y - pathPoints[pathPoints.length - 2].y, width / numPoints)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, 50, 0x00BCD4) // Cyan for massive jumps
  }

  private createSpeedValley(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    const smoothProgress = this.easeInOutQuad(progress)
    const endHeight = startHeight + (this.targetHeight - startHeight) * smoothProgress
    
    const pathPoints = []
    const numPoints = 25
    
    pathPoints.push({ x: x, y: startHeight })
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Create deep valley shape that builds speed
      let valleyShape = 1.0
      if (progress < 0.7) {
        // Descending into valley
        valleyShape = Math.sin((progress + localProgress / this.terrainLength) * Math.PI * 0.8)
      } else {
        // Climbing out of valley
        valleyShape = 0.2 + Math.sin((progress + localProgress / this.terrainLength) * Math.PI * 1.2) * 0.8
      }
      
      const curveProgress = this.easeInOutQuad(localProgress)
      const pointY = startHeight + (endHeight - startHeight) * curveProgress * valleyShape
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, 50, 0xFFEB3B) // Yellow for speed valleys
  }

  private createGradualDownhill(chunk: LevelChunk, x: number, width: number): void {
    const groundHeight = 50
    const startHeight = this.lastChunkEndHeight
    
    // Create a gentle downhill slope for natural speed building
    const downhillAmount = 60 + Math.random() * 40 // 60-100 pixel descent
    const endHeight = Math.min(GameSettings.level.groundY + 50, startHeight + downhillAmount)
    
    // Create smooth downhill path
    const pathPoints = []
    const numPoints = 25
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints
      const pointX = x + (width * progress)
      
      // Gentle curved descent - starts flat then gradually slopes down
      let curveProgress = progress
      if (progress < 0.3) {
        // Start almost flat for natural feel
        curveProgress = progress * 0.2
      } else {
        // Then gentle acceleration into the slope
        curveProgress = 0.06 + ((progress - 0.3) / 0.7) * 0.94
      }
      
      const pointY = startHeight + (endHeight - startHeight) * curveProgress
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    // Update tracking for next chunk
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, groundHeight, 0x9ACD32) // Yellow-green for speed sections
  }

  private createFlowingSlope(chunk: LevelChunk, x: number, width: number): void {
    const groundHeight = 50
    const startHeight = this.lastChunkEndHeight
    const slopeDirection = Math.random() > 0.5 ? 1 : -1 // Up or down
    const maxElevationChange = 120 * slopeDirection
    const endHeight = Math.max(GameSettings.level.groundY - 150, Math.min(GameSettings.level.groundY + 50, startHeight + maxElevationChange))
    
    // Create smooth flowing slope that connects properly
    const pathPoints = []
    const numPoints = 30
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints
      const pointX = x + (width * progress)
      
      // Smooth interpolation from start to end height
      const smoothProgress = 3 * progress * progress - 2 * progress * progress * progress
      const pointY = startHeight + (endHeight - startHeight) * smoothProgress
      
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    // Update tracking for next chunk
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, groundHeight, 0xB0E0E6)
  }

  private createFlowingHill(chunk: LevelChunk, x: number, width: number): void {
    const groundHeight = 50
    const startHeight = this.lastChunkEndHeight
    const hillHeight = 150
    
    // Create flowing hill that connects to previous chunk
    const pathPoints = []
    const numPoints = 40
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints
      const pointX = x + (width * progress)
      
      // Bell curve for hill shape, starting and ending at proper heights
      const bellCurve = Math.exp(-Math.pow((progress - 0.5) * 4, 2))
      const hillOffset = -hillHeight * bellCurve
      
      // Blend hill with proper start/end heights
      let baseHeight = startHeight
      if (progress > 0.8) {
        // Transition back toward ground level at the end
        const transitionProgress = (progress - 0.8) / 0.2
        baseHeight = startHeight + (GameSettings.level.groundY - startHeight) * transitionProgress
      }
      
      const pointY = baseHeight + hillOffset
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    // Update tracking for next chunk
    const endHeight = pathPoints[pathPoints.length - 1].y
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(pathPoints[pathPoints.length - 1].y - pathPoints[pathPoints.length - 2].y, width / numPoints)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, groundHeight, 0x87CEEB)
  }

  private createFlowingValley(chunk: LevelChunk, x: number, width: number): void {
    const groundHeight = 50
    const startHeight = this.lastChunkEndHeight
    const valleyDepth = 100
    
    // Create flowing valley that connects properly
    const pathPoints = []
    const numPoints = 35
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints
      const pointX = x + (width * progress)
      
      // Inverted bell curve for valley, starting from previous chunk height
      const bellCurve = Math.exp(-Math.pow((progress - 0.5) * 3, 2))
      const valleyOffset = valleyDepth * bellCurve
      
      // Create smooth transition into and out of valley
      let baseHeight = startHeight
      if (progress > 0.7) {
        // Transition back toward ground level at the end
        const transitionProgress = (progress - 0.7) / 0.3
        baseHeight = startHeight + (GameSettings.level.groundY - startHeight) * transitionProgress
      }
      
      const pointY = baseHeight + valleyOffset
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    // Update tracking for next chunk
    const endHeight = pathPoints[pathPoints.length - 1].y
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(pathPoints[pathPoints.length - 1].y - pathPoints[pathPoints.length - 2].y, width / numPoints)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, groundHeight, 0x4682B4)
  }

  private createBigJump(chunk: LevelChunk, x: number, width: number): void {
    const groundHeight = 50
    const startHeight = this.lastChunkEndHeight
    const jumpHeight = 200
    
    // Create a big ramp for jumping that connects properly
    const pathPoints = []
    const numPoints = 25
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints
      const pointX = x + (width * progress)
      
      let pointY = startHeight
      
      if (progress < 0.3) {
        // Gentle approach from previous chunk height
        const approachProgress = progress / 0.3
        pointY = startHeight - (jumpHeight * 0.1 * approachProgress)
      } else if (progress < 0.7) {
        // Steep ramp
        const rampProgress = (progress - 0.3) / 0.4
        pointY = startHeight - jumpHeight * 0.1 - (jumpHeight * 0.9 * rampProgress)
      } else {
        // Launch point - flat or slight decline
        const launchProgress = (progress - 0.7) / 0.3
        pointY = startHeight - jumpHeight + (jumpHeight * 0.3 * launchProgress)
      }
      
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    // Update tracking for next chunk (after a big jump, return closer to ground level)
    const endHeight = pathPoints[pathPoints.length - 1].y
    this.lastChunkEndHeight = Math.max(endHeight, GameSettings.level.groundY - 50)
    this.lastChunkEndAngle = Math.atan2(pathPoints[pathPoints.length - 1].y - pathPoints[pathPoints.length - 2].y, width / numPoints)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, GameSettings.level.groundY, groundHeight, 0x6495ED)
  }

  private createSmoothTerrain(chunk: LevelChunk, pathPoints: {x: number, y: number}[], x: number, width: number, groundY: number, groundHeight: number, color: number): void {
    // Smooth the path points for more natural curves
    const smoothedPoints = this.smoothPath(pathPoints)
    chunk.terrainPath = smoothedPoints
    
    // Visual terrain with solid snow white color
    const terrain = this.scene.add.graphics()
    const fillColor = 0xF8F8FF // Snow white for all terrain
    
    terrain.fillStyle(fillColor, 1.0) // Solid opaque snow white
    terrain.lineStyle(4, color, 0.8) // Colored outline for terrain variety
    
    terrain.beginPath()
    terrain.moveTo(smoothedPoints[0].x, smoothedPoints[0].y)
    
    // Draw smooth curves using lineTo (Phaser Graphics doesn't have quadraticCurveTo)
    for (let i = 1; i < smoothedPoints.length; i++) {
      terrain.lineTo(smoothedPoints[i].x, smoothedPoints[i].y)
    }
    
    // Complete the shape by filling below terrain (adequate depth for downhill terrain)
    const bottomY = Math.max(...smoothedPoints.map(p => p.y)) + 400 // Extend 400px below terrain for deep downhills
    terrain.lineTo(x + width, bottomY)
    terrain.lineTo(x, bottomY)
    terrain.closePath()
    terrain.fillPath()
    terrain.strokePath()
    
    // Set proper depth so terrain stays behind player but in front of background
    terrain.setDepth(-1)
    
    // Create physics body using the same limited terrain depth
    const centerX = x + width / 2
    const minY = Math.min(...smoothedPoints.map(p => p.y))
    const maxY = bottomY // Use the limited bottomY
    const centerY = (minY + maxY) / 2
    
    const vertices = []
    smoothedPoints.forEach(point => {
      vertices.push({ x: point.x - centerX, y: point.y - centerY })
    })
    // Add bottom vertices to close the shape (limited depth)
    vertices.push({ x: (x + width) - centerX, y: bottomY - centerY })
    vertices.push({ x: x - centerX, y: bottomY - centerY })
    
    const ground = this.scene.add.polygon(
      centerX,
      centerY,
      vertices,
      0x000000, 0 // Invisible - only for physics
    )
    ground.setDepth(-2) // Behind terrain visual but in front of background
    
    this.scene.matter.add.gameObject(ground, { 
      isStatic: true,
      shape: {
        type: 'fromVerts',
        verts: vertices
      }
    })
    
    chunk.ramps.push(terrain)
    chunk.ground.push(ground)
  }

  private smoothPath(points: {x: number, y: number}[]): {x: number, y: number}[] {
    if (points.length <= 2) return points
    
    // Apply simple smoothing filter to reduce sharp angles
    const smoothed = [points[0]] // Always keep first point
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1]
      const current = points[i]
      const next = points[i + 1]
      
      // Average current point with neighbors for smoothness
      const smoothedX = current.x
      const smoothedY = (prev.y + current.y * 2 + next.y) / 4
      
      smoothed.push({ x: smoothedX, y: smoothedY })
    }
    
    smoothed.push(points[points.length - 1]) // Always keep last point
    
    return smoothed
  }


  private createGapWithPlatforms(chunk: LevelChunk, x: number, width: number): void {
    const platformWidth = 100
    const gapWidth = width - (platformWidth * 2)
    const groundY = GameSettings.level.groundY
    
    // Create terrain path with gap
    chunk.terrainPath = [
      { x: x, y: groundY },
      { x: x + platformWidth, y: groundY },
      { x: x + width - platformWidth, y: groundY },
      { x: x + width, y: groundY }
    ]
    
    // Start platform
    const startPlatform = this.scene.add.rectangle(
      x + platformWidth / 2,
      groundY + 25,
      platformWidth,
      50,
      0x444444
    )
    startPlatform.setStrokeStyle(2, 0x666666)
    this.scene.matter.add.gameObject(startPlatform, { isStatic: true })
    chunk.ground.push(startPlatform)
    
    // End platform
    const endPlatform = this.scene.add.rectangle(
      x + width - platformWidth / 2,
      groundY + 25,
      platformWidth,
      50,
      0x444444
    )
    endPlatform.setStrokeStyle(2, 0x666666)
    this.scene.matter.add.gameObject(endPlatform, { isStatic: true })
    chunk.ground.push(endPlatform)
    
    // Optional moving platform in the gap
    if (Math.random() < 0.7) {
      const platform = new MovingPlatform(
        this.scene,
        x + platformWidth + gapWidth / 2,
        groundY - 100
      )
      chunk.platforms.push(platform)
    }
  }

  private addObstacles(chunk: LevelChunk): void {
    if (Math.random() < GameSettings.obstacles.spawnRate) {
      const spikeX = chunk.x + Math.random() * (chunk.width - GameSettings.obstacles.spikeWidth)
      const spike = new Spike(this.scene, spikeX, GameSettings.level.groundY - GameSettings.obstacles.spikeHeight)
      chunk.spikes.push(spike)
    }
  }

  private addTokens(chunk: LevelChunk): void {
    // Reduce token spawn rate to improve performance
    if (Math.random() < 0.3) { // Reduced from 0.8 to 0.3
      this.createTokenTrail(chunk)
    }
  }

  private createTokenTrail(chunk: LevelChunk): void {
    // Create trails that follow natural player paths
    const trailTypes = ['ground_follow', 'jump_arc', 'ramp_launch']
    const trailType = trailTypes[Math.floor(Math.random() * trailTypes.length)]
    
    switch (trailType) {
      case 'ground_follow':
        this.createGroundFollowingTrail(chunk)
        break
      case 'jump_arc':
        this.createJumpArcTrail(chunk)
        break
      case 'ramp_launch':
        this.createRampLaunchTrail(chunk)
        break
    }
  }

  private createGroundFollowingTrail(chunk: LevelChunk): void {
    // Trail that follows the terrain contour
    const numTokens = 2 + Math.floor(Math.random() * 2) // 2-3 tokens (reduced)
    const spacing = chunk.width / (numTokens + 1)
    
    for (let i = 1; i <= numTokens; i++) {
      const tokenX = chunk.x + i * spacing
      const terrainHeight = this.getTerrainHeightAtX(tokenX, chunk)
      const tokenY = terrainHeight - 60 - Math.random() * 40 // 60-100 pixels above terrain
      
      const token = new Token(this.scene, tokenX, tokenY)
      chunk.tokens.push(token)
    }
  }

  private createJumpArcTrail(chunk: LevelChunk): void {
    // Arc-shaped trail for jump collections
    const numTokens = 3 + Math.floor(Math.random() * 2) // 3-4 tokens (reduced)
    const startX = chunk.x + 50
    const endX = chunk.x + chunk.width - 50
    const width = endX - startX
    
    const baseHeight = this.getTerrainHeightAtX(chunk.x + chunk.width / 2, chunk)
    const arcHeight = 150 + Math.random() * 100 // Arc goes 150-250 pixels up
    
    for (let i = 0; i < numTokens; i++) {
      const progress = i / (numTokens - 1) // 0 to 1
      const tokenX = startX + progress * width
      
      // Create parabolic arc
      const arcProgress = 4 * progress * (1 - progress) // Parabola: peaks at 0.5
      const tokenY = baseHeight - 80 - (arcHeight * arcProgress)
      
      const token = new Token(this.scene, tokenX, tokenY)
      chunk.tokens.push(token)
    }
  }

  private createRampLaunchTrail(chunk: LevelChunk): void {
    // Trail that follows a ramp launch trajectory
    if (!chunk.terrainPath || chunk.terrainPath.length < 3) {
      // Fallback to ground following if no terrain path
      this.createGroundFollowingTrail(chunk)
      return
    }
    
    const numTokens = 3 + Math.floor(Math.random() * 2) // 3-4 tokens (reduced)
    const launchPoint = chunk.x + chunk.width * 0.7 // Launch from 70% through chunk
    const launchHeight = this.getTerrainHeightAtX(launchPoint, chunk)
    
    for (let i = 0; i < numTokens; i++) {
      const progress = i / (numTokens - 1)
      const tokenX = launchPoint + progress * 200 // Trail extends 200px forward
      
      // Simulate launch trajectory (parabolic path)
      const horizontalDistance = progress * 200
      const initialVelocityY = -300 // Launch velocity
      const gravity = 600
      const time = horizontalDistance / 300 // Assuming 300px/s horizontal speed
      
      const trajectoryY = initialVelocityY * time + 0.5 * gravity * time * time
      const tokenY = launchHeight + trajectoryY
      
      // Don't place tokens below ground
      const groundAtX = this.getTerrainHeightAtX(tokenX, chunk)
      if (tokenY < groundAtX - 50) {
        const token = new Token(this.scene, tokenX, tokenY)
        chunk.tokens.push(token)
      }
    }
  }

  private getTerrainHeightAtX(x: number, chunk: LevelChunk): number {
    if (!chunk.terrainPath || chunk.terrainPath.length === 0) {
      return GameSettings.level.groundY
    }
    
    // Find terrain height by interpolating between path points
    for (let i = 0; i < chunk.terrainPath.length - 1; i++) {
      const p1 = chunk.terrainPath[i]
      const p2 = chunk.terrainPath[i + 1]
      
      if (x >= p1.x && x <= p2.x) {
        // Linear interpolation
        const t = (x - p1.x) / (p2.x - p1.x)
        return p1.y + t * (p2.y - p1.y)
      }
    }
    
    // Return closest point if not found
    return chunk.terrainPath[0]?.y || GameSettings.level.groundY
  }

  public update(cameraX: number): void {
    // Generate new chunks ahead of camera - increased distance for infinite runner
    const viewDistance = GameSettings.canvas.width * 3
    
    // Always generate chunks ahead - infinite terrain
    while (this.nextChunkX < cameraX + viewDistance) {
      this.generateChunk(this.nextChunkX)
    }

    // Remove chunks that are far behind camera
    const cleanupDistance = GameSettings.canvas.width
    this.chunks = this.chunks.filter(chunk => {
      if (chunk.x + chunk.width < cameraX - cleanupDistance) {
        // Clean up game objects
        chunk.ground.forEach(ground => {
          try {
            // Remove Matter.js body before destroying Phaser object
            if (ground.body && this.scene.matter) {
              this.scene.matter.world.remove(ground.body)
              ground.body = null // Clear reference
            }
            ground.destroy()
          } catch (error) {
            console.error("Ground object destroy error:", error, ground)
          }
        })
        chunk.ramps.forEach(ramp => {
          try { ramp.destroy() } catch (error) { console.error("Ramp destroy error:", error) }
        })
        chunk.tokens.forEach(token => {
          try { token.destroy() } catch (error) { console.error("Token destroy error:", error) }
        })
        chunk.spikes.forEach(spike => {
          try { spike.destroy() } catch (error) { console.error("Spike destroy error:", error) }
        })
        chunk.platforms.forEach(platform => {
          try { platform.destroy() } catch (error) { console.error("Platform destroy error:", error) }
        })
        return false
      }
      return true
    })
  }

  public getGroundBodies(): Phaser.GameObjects.GameObject[] {
    const bodies: Phaser.GameObjects.GameObject[] = []
    this.chunks.forEach(chunk => {
      bodies.push(...chunk.ground)
    })
    return bodies
  }

  public getTokens(): Token[] {
    const tokens: Token[] = []
    this.chunks.forEach(chunk => {
      tokens.push(...chunk.tokens)
    })
    return tokens
  }

  public getSpikes(): Spike[] {
    const spikes: Spike[] = []
    this.chunks.forEach(chunk => {
      spikes.push(...chunk.spikes)
    })
    return spikes
  }

  public getMovingPlatforms(): MovingPlatform[] {
    const platforms: MovingPlatform[] = []
    this.chunks.forEach(chunk => {
      platforms.push(...chunk.platforms)
    })
    return platforms
  }

  public getChunks(): LevelChunk[] {
    return [...this.chunks]
  }

  public destroy(): void {
    this.chunks.forEach(chunk => {
      chunk.ground.forEach(ground => {
        try {
          // Remove Matter.js body before destroying Phaser object
          if (ground.body && this.scene.matter) {
            this.scene.matter.world.remove(ground.body)
            ground.body = null // Clear reference
          }
          ground.destroy()
        } catch (error) {
          console.error("Ground object destroy error in main destroy:", error, ground)
        }
      })
      chunk.ramps.forEach(ramp => {
        try { ramp.destroy() } catch (error) { console.error("Ramp destroy error in main destroy:", error) }
      })
      chunk.tokens.forEach(token => {
        try { token.destroy() } catch (error) { console.error("Token destroy error in main destroy:", error) }
      })
      chunk.spikes.forEach(spike => {
        try { spike.destroy() } catch (error) { console.error("Spike destroy error in main destroy:", error) }
      })
      chunk.platforms.forEach(platform => {
        try { platform.destroy() } catch (error) { console.error("Platform destroy error in main destroy:", error) }
      })
    })
    this.chunks = []
  }
}