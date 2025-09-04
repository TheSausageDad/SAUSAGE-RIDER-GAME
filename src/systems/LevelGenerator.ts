import GameSettings from "../config/GameSettings"
import { Token } from "../objects/Token"
import { Spike } from "../objects/Spike"
import { MovingPlatform } from "../objects/MovingPlatform"
import { Rail } from "../objects/Rail"
import { Rock } from "../objects/Rock"
import { GameObjectPools } from "./ObjectPool"

export interface LevelChunk {
  x: number
  width: number
  ground: Phaser.GameObjects.GameObject[]
  ramps: Phaser.GameObjects.Graphics[]
  tokens: Token[]
  spikes: Spike[]
  platforms: MovingPlatform[]
  rails: Rail[]
  rocks: Rock[]
  terrainPath: { x: number, y: number }[] // Store terrain points for smooth physics
}

export class LevelGenerator {
  private scene: Phaser.Scene
  private objectPools: GameObjectPools
  private chunks: LevelChunk[] = []
  private nextChunkX: number = 0
  private chunkPool: LevelChunk[] = []
  private lastChunkEndHeight: number = GameSettings.level.groundY
  private lastChunkEndAngle: number = 0
  
  // Extended terrain generation state
  private currentTerrainType: string | null = null
  private previousTerrainType: string | null = null // Track previous terrain to avoid rail clustering
  private railCooldown: number = 0 // Prevent multiple rail chunks in succession
  private rockCooldown: number = 0 // Prevent multiple rock spawns in succession
  private terrainProgress: number = 0
  private terrainLength: number = 0
  private targetHeight: number = GameSettings.level.groundY

  constructor(scene: Phaser.Scene, objectPools: GameObjectPools) {
    this.scene = scene
    this.objectPools = objectPools
    this.generateInitialChunks()
  }

  private generateInitialChunks(): void {
    // Set starting position WAY higher up for epic downhill start
    this.lastChunkEndHeight = GameSettings.level.groundY - 500 // Start 500px above ground level
    this.lastChunkEndAngle = 0
    
    // PREVENT RAILS AT START: Set a long rail cooldown to ensure no rails spawn at beginning
    this.railCooldown = 10 // 10 chunks before any rails can spawn
    
    console.log("🏁 GENERATING INITIAL CHUNKS... (rails prevented for first 10 chunks)")
    
    // Generate multiple starting downhill chunks for long epic descent
    this.generateChunk(0, true) // First downhill chunk
    this.generateChunk(this.nextChunkX, true) // Second downhill chunk
    this.generateChunk(this.nextChunkX, true) // Third downhill chunk
    this.generateChunk(this.nextChunkX, true) // Fourth downhill chunk
    
    // Continue with normal terrain generation
    this.generateChunk(this.nextChunkX, false)
    
    // Generate several more chunks ahead normally
    for (let i = 4; i < 8; i++) {
      this.generateChunk(this.nextChunkX)
    }
  }

  private generateChunk(x: number, isStarting: boolean = false): LevelChunk {
    console.log(`🟦 GENERATING CHUNK at x=${x}, isStarting=${isStarting}`)
    const chunkWidth = GameSettings.level.chunkWidth
    const chunk: LevelChunk = {
      x,
      width: chunkWidth,
      ground: [],
      ramps: [],
      tokens: [],
      spikes: [],
      platforms: [],
      rails: [],
      rocks: [],
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
      
      // Rails are now only spawned on dedicated rail terrain chunks (no forced spawning)
    }
    
    // Rails are now only spawned on dedicated rail terrain chunks
    // this.addRails(chunk) - Disabled random rail spawning
    
    // Debug: Add visual hitboxes for all game objects in this chunk (DISABLED for clean gameplay)
    // this.addDebugHitboxes(chunk)

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
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'epic_downhill')
    
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
    // Removed outline for cleaner appearance
    groundGraphics.beginPath()
    groundGraphics.moveTo(x, startHeight)
    groundGraphics.lineTo(x + width, endHeight)
    groundGraphics.lineTo(x + width, GameSettings.canvas.height)
    groundGraphics.lineTo(x, GameSettings.canvas.height)
    groundGraphics.closePath()
    groundGraphics.fillPath()
    // Removed strokePath() for no outline
    groundGraphics.setDepth(-1)
    
    // Safety check: Ensure flat ground doesn't render above player level  
    const maxAllowedHeight = 50
    if (startHeight < maxAllowedHeight) {
      console.warn(`⚠️ Flat ground too high (${startHeight}px), adjusting to ${maxAllowedHeight}px`)
      groundGraphics.y = Math.max(0, maxAllowedHeight - startHeight)
    }
    
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
    
    // Reduced terrain logging for performance
    if (Math.random() < 0.1) {
      console.log(`🌄 NEW TERRAIN: ${terrainType < 0.25 ? 'downhill' : terrainType < 0.45 ? 'uphill' : 'varied'}`)
    }
    
    if (terrainType < 0.25) {
      // Gradual downhills (3-5 chunks) - 25% chance for speed building
      this.currentTerrainType = 'epic_downhill'
      this.terrainLength = 3 + Math.floor(Math.random() * 3) // 3-5 chunks for gradual descent
      this.targetHeight = this.lastChunkEndHeight + 200 + Math.random() * 300 // 200-500px downhill
      // Terrain logging removed for performance
    } else if (terrainType < 0.45) {
      // Smooth uphills (2-4 chunks) - 20% chance for momentum challenges
      this.currentTerrainType = 'steep_uphill'
      this.terrainLength = 2 + Math.floor(Math.random() * 3) // 2-4 chunks for gradual climb
      this.targetHeight = this.lastChunkEndHeight - 150 - Math.random() * 200 // 150-350px uphill
      // Terrain logging removed for performance
    } else if (terrainType < 0.65) {
      // Rolling hills (3-5 chunks) - 20% chance for varied terrain
      this.currentTerrainType = 'dramatic_hills'
      this.terrainLength = 3 + Math.floor(Math.random() * 3) // 3-5 chunks for rolling landscape
      this.targetHeight = this.lastChunkEndHeight + (Math.random() - 0.5) * 200 // ±100px variation
      // Terrain logging removed for performance
    } else if (terrainType < 0.80) {
      // Gentle slopes (2-3 chunks) - 15% chance for quick elevation changes
      this.currentTerrainType = 'mini_slopes'
      this.terrainLength = 2 + Math.floor(Math.random() * 2) // 2-3 chunks for gentle changes
      this.targetHeight = this.lastChunkEndHeight + (Math.random() - 0.5) * 150 // ±75px gentle changes
      // Terrain logging removed for performance
    } else if (terrainType < 0.90) {
      // Big jump hills (2-3 chunks) - 10% chance for exciting jumps
      this.currentTerrainType = 'massive_jump'
      this.terrainLength = 2 + Math.floor(Math.random() * 2) // 2-3 chunks for jump setup
      this.targetHeight = this.lastChunkEndHeight + (Math.random() - 0.5) * 300 // ±150px for jump variety
      // Terrain logging removed for performance
    } else if (terrainType < 0.95 && this.railCooldown === 0) {
      // Rail sections (2-3 chunks) - 5% chance when available
      this.currentTerrainType = 'rail_flat'
      this.terrainLength = 2 + Math.floor(Math.random() * 2) // 2-3 chunks for rail grinding
      this.targetHeight = this.lastChunkEndHeight // Keep current height for rails
      this.railCooldown = 0 // Reset cooldown
      // Terrain logging removed for performance
    } else {
      // Flat breathing room (1-2 chunks) - 5-10% chance
      this.currentTerrainType = 'extended_flat'
      this.terrainLength = 1 + Math.floor(Math.random() * 2) // 1-2 chunks for rest
      this.targetHeight = this.lastChunkEndHeight // Keep current height
      // Terrain logging removed for performance
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
      case 'rail_flat':
        this.createRailFlat(chunk, x, width, progress)
        break
      case 'rail_downhill':
        this.createRailDownhill(chunk, x, width, progress)
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
      case 'jump_chain':
        this.createJumpChain(chunk, x, width, progress)
        break
      case 'speed_valley':
        this.createSpeedValley(chunk, x, width, progress)
        break
      case 'extended_flat':
        this.createExtendedFlat(chunk, x, width)
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
        this.createExtendedFlat(chunk, x, width)
        break
    }
    
    // Check if we've completed this terrain feature
    if (this.terrainProgress >= this.terrainLength - 1) {
      this.previousTerrainType = this.currentTerrainType // Store previous terrain type
      this.currentTerrainType = null
      this.terrainProgress = 0
      this.terrainLength = 0
      
      // Decrement rail cooldown (minimum 0)
      if (this.railCooldown > 0) {
        this.railCooldown--
        console.log(`🕒 Rail cooldown decremented to ${this.railCooldown}`)
      }
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
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'epic_downhill')
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
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'steep_uphill')
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
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'dramatic_hills')
  }

  private createExtendedFlat(chunk: LevelChunk, x: number, width: number): void {
    // Convert flat sections to mini slopes for more visual interest
    const startHeight = this.lastChunkEndHeight
    const pathPoints = []
    const numPoints = 20
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints
      const pointX = x + (width * progress)
      
      // Add very subtle rolling variations instead of pure flat
      const subtleVariation = Math.sin(progress * Math.PI * 2) * 15
      const pointY = startHeight + subtleVariation
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    this.lastChunkEndHeight = pathPoints[pathPoints.length - 1].y
    this.lastChunkEndAngle = 0
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'mini_slopes')
    
    // Add rock obstacles to flat terrain (15% chance)
    this.addRocksToFlat(chunk)
  }

  private createRailFlat(chunk: LevelChunk, x: number, width: number, progress: number): void {
    // Perfect flat terrain specifically designed for rail grinding
    const startHeight = this.lastChunkEndHeight
    const pathPoints = []
    const numPoints = 15 // Fewer points for perfectly straight flat sections
    
    // Create completely flat terrain
    for (let i = 0; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      pathPoints.push({ x: pointX, y: startHeight })
    }
    
    // Update tracking - stay at same height
    this.lastChunkEndHeight = startHeight
    this.lastChunkEndAngle = 0 // Completely flat
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'rail_flat')
    
    // ALWAYS spawn a rail on rail-specific flat terrain
    this.guaranteeRailSpawn(chunk)
  }

  private createRailDownhill(chunk: LevelChunk, x: number, width: number, progress: number): void {
    // Gentle downhill specifically designed for fast rail grinding
    const startHeight = this.lastChunkEndHeight
    const smoothProgress = this.easeInOutQuad(progress)
    const endHeight = startHeight + (this.targetHeight - startHeight) * smoothProgress
    
    const pathPoints = []
    const numPoints = 20
    
    // Create smooth, gentle downhill perfect for maintaining speed on rails
    for (let i = 0; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Very gentle curve - almost straight but with slight downward slope
      const curveProgress = localProgress * localProgress * (3 - 2 * localProgress) // Smooth S-curve
      const pointY = startHeight + (endHeight - startHeight) * curveProgress
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    // Update tracking
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'rail_downhill')
    
    // ALWAYS spawn a rail on rail-specific downhill terrain
    this.guaranteeRailSpawn(chunk)
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
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'massive_jump')
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
      
      // Add some natural variation and launch potential at the end
      const variation = Math.sin(localProgress * Math.PI * 3) * 20 * (1 - progress * 0.5)
      
      // Add launch ramp at end of epic downhills for big air opportunities
      const launchRamp = localProgress > 0.8 && progress > 0.6 ? 
        Math.sin((localProgress - 0.8) / 0.2 * Math.PI) * -40 : 0 // Upward curve at end for launch
      
      const curveProgress = this.easeInOutQuad(localProgress)
      const pointY = startHeight + (endHeight - startHeight) * curveProgress + variation + launchRamp
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'epic_downhill')
  }

  private createSteepUphill(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    
    // Smooth, gradual uphills with gentle curves
    const smoothProgress = this.easeInOutQuad(progress)
    const endHeight = startHeight + (this.targetHeight - startHeight) * smoothProgress
    
    const pathPoints = []
    const numPoints = 30 // More points for smoother curves
    
    pathPoints.push({ x: x, y: startHeight })
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Create smooth, gradual uphill without harsh steepness changes
      const curveProgress = this.easeInOutQuad(localProgress)
      
      // Add very gentle undulation to make it interesting but not jagged
      const gentleWave = Math.sin(localProgress * Math.PI * 1.5) * 8 // Very small wave
      
      const pointY = startHeight + (endHeight - startHeight) * curveProgress + gentleWave
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'steep_uphill')
  }

  private createMiniSlopes(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    const endHeight = startHeight + (this.targetHeight - startHeight) * progress
    
    const pathPoints = []
    const numPoints = 25 // More points for smoother curves
    
    pathPoints.push({ x: x, y: startHeight })
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Create gentle rolling terrain instead of sharp bumps
      const primarySlope = startHeight + (endHeight - startHeight) * this.easeInOutQuad(localProgress)
      
      // Gentle rolling hills with smooth transitions
      const gentleRolls = Math.sin(localProgress * Math.PI * 2) * 20 + // Primary gentle roll
                         Math.sin(localProgress * Math.PI * 3) * 8   // Secondary smaller roll
      
      // Create smooth launch ramps instead of sharp jumps
      const rampCurve = Math.sin(localProgress * Math.PI * 1.5)
      const launchRamp = rampCurve > 0 ? rampCurve * 15 : 0 // Gentle upward ramps
      
      const pointY = primarySlope + gentleRolls - launchRamp
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'mini_slopes')
  }

  private createDramaticHills(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    const endHeight = startHeight + (this.targetHeight - startHeight) * progress
    
    const pathPoints = []
    const numPoints = 40 // More points for smoother rolling hills
    
    pathPoints.push({ x: x, y: startHeight })
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Create smooth rolling landscape that flows between chunks
      const progressEased = this.easeInOutQuad(localProgress)
      const baseHeight = startHeight + (endHeight - startHeight) * progressEased
      
      // Layer smooth rolling waves for natural hill patterns
      const primaryRoll = Math.sin(localProgress * Math.PI * 1.5) * 40  // Main rolling hill
      const secondaryRoll = Math.sin(localProgress * Math.PI * 2.5) * 20 // Secondary gentler roll
      const detailRoll = Math.sin(localProgress * Math.PI * 4) * 8       // Fine detail variation
      
      // Create smooth launch opportunities on upward slopes
      const launchCurve = Math.sin(localProgress * Math.PI * 2)
      const launchRamp = launchCurve > 0 ? launchCurve * 12 : 0 // Gentle launch ramps
      
      const pointY = baseHeight + primaryRoll + secondaryRoll + detailRoll - launchRamp
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    this.lastChunkEndHeight = endHeight
    this.lastChunkEndAngle = Math.atan2(endHeight - startHeight, width)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'dramatic_hills')
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
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'massive_jump')
  }

  private createJumpChain(chunk: LevelChunk, x: number, width: number, progress: number): void {
    const startHeight = this.lastChunkEndHeight
    const endHeight = startHeight + (this.targetHeight - startHeight) * this.easeInOutQuad(progress)
    
    const pathPoints = []
    const numPoints = 35
    
    pathPoints.push({ x: x, y: startHeight })
    
    // Create a series of jump ramps - 3-4 small jumps in sequence
    const numJumps = 3 + Math.floor(this.terrainLength / 3) // 3-4 jumps based on terrain length
    
    for (let i = 1; i <= numPoints; i++) {
      const localProgress = i / numPoints
      const pointX = x + (width * localProgress)
      
      // Base terrain following the overall target height
      const baseY = startHeight + (endHeight - startHeight) * localProgress
      
      // Add jump ramps as wave pattern
      const jumpFreq = numJumps * Math.PI // Multiple jumps across the chunk
      const jumpWave = Math.sin(localProgress * jumpFreq)
      
      // Only create upward ramps (positive parts of sine wave)
      const jumpHeight = Math.max(0, jumpWave) * 50 // Up to 50px jump ramps
      
      // Add small launch angles at peak of each jump
      const peakDetection = Math.cos(localProgress * jumpFreq)
      const launchAngle = peakDetection < -0.8 ? Math.sin(localProgress * jumpFreq * 4) * 15 : 0
      
      const pointY = baseY - jumpHeight - launchAngle
      
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    this.lastChunkEndHeight = pathPoints[pathPoints.length - 1].y
    this.lastChunkEndAngle = Math.atan2(pathPoints[pathPoints.length - 1].y - pathPoints[pathPoints.length - 2].y, width / numPoints)
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'jump_chain')
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
    
    this.createSmoothTerrain(chunk, pathPoints, x, width, 'speed_valley')
  }






  private createSmoothTerrain(chunk: LevelChunk, pathPoints: {x: number, y: number}[], x: number, width: number, terrainType?: string): void {
    // Smooth the path points for more natural curves
    const smoothedPoints = this.smoothPath(pathPoints)
    
    // Safety check: Ensure terrain doesn't extend too high - CLIP POINTS BEFORE USE
    const maxAllowedHeight = 50 // Never allow terrain above this Y coordinate
    const minTerrainY = Math.min(...smoothedPoints.map(p => p.y))
    let terrainOffset = 0
    
    // If terrain extends too high, calculate offset to clip it down
    if (minTerrainY < maxAllowedHeight) {
      terrainOffset = Math.max(0, maxAllowedHeight - minTerrainY)
      console.warn(`⚠️ Terrain extending too high (${minTerrainY}px), clipping with offset ${terrainOffset}px`)
      
      // Apply offset to ALL terrain points so physics and visuals match
      smoothedPoints.forEach(point => {
        point.y += terrainOffset
      })
    }
    
    // Store the corrected terrain path for collision detection
    chunk.terrainPath = smoothedPoints
    
    // Enhanced visual terrain with color-coded appearance
    const terrain = this.scene.add.graphics()
    
    // All terrain now uses classic snow white appearance
    const topColor = 0xFFFAFA // Snow white
    const bottomColor = 0xF0F8FF // Alice blue
    
    // Main terrain with color-coded gradient fill
    terrain.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1, 1, 1, 1)
    
    terrain.beginPath()
    terrain.moveTo(smoothedPoints[0].x, smoothedPoints[0].y)
    
    // Draw smooth curves
    for (let i = 1; i < smoothedPoints.length; i++) {
      terrain.lineTo(smoothedPoints[i].x, smoothedPoints[i].y)
    }
    
    // Complete the shape
    const bottomY = Math.max(...smoothedPoints.map(p => p.y)) + 400
    terrain.lineTo(x + width, bottomY)
    terrain.lineTo(x, bottomY)
    terrain.closePath()
    terrain.fillPath()
    
    // Add snow texture details
    this.addSnowTexture(terrain, smoothedPoints, x, width)
    
    // Add subtle snow drifts and patterns
    this.addSnowDetails(terrain, smoothedPoints, x, width)
    
    // Set proper depth so terrain stays behind player but in front of background  
    terrain.setDepth(-1)
    
    // Update lastChunkEndHeight to reflect the ACTUAL clipped terrain height
    // This ensures the next chunk connects properly to the clipped terrain
    if (smoothedPoints.length > 0) {
      const actualEndHeight = smoothedPoints[smoothedPoints.length - 1].y
      this.lastChunkEndHeight = actualEndHeight
      console.log(`📐 Updated lastChunkEndHeight to clipped value: ${actualEndHeight.toFixed(1)}px (was potentially unclipped)`)
    }
    
    // Create physics body using the SAME clipped terrain points
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



  private addObstacles(chunk: LevelChunk): void {
    // Spikes disabled - no obstacles will spawn
    // if (Math.random() < GameSettings.obstacles.spawnRate) {
    //   const spikeX = chunk.x + Math.random() * (chunk.width - GameSettings.obstacles.spikeWidth)
    //   const spike = this.objectPools.spikePool.get(spikeX, GameSettings.level.groundY - GameSettings.obstacles.spikeHeight)
    //   chunk.spikes.push(spike)
    // }
  }

  private addTokens(chunk: LevelChunk): void {
    // Increase token spawn rate for better trail following
    if (Math.random() < 0.6) { // Increased spawn rate for more frequent trails
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
    // Trail that follows the terrain contour - more predictable and easier to follow
    const numTokens = 4 + Math.floor(Math.random() * 2) // 4-5 tokens for better trail
    const spacing = chunk.width / (numTokens + 1)
    
    for (let i = 1; i <= numTokens; i++) {
      const tokenX = chunk.x + i * spacing
      const terrainHeight = this.getTerrainHeightAtX(tokenX, chunk)
      
      // Calculate safe distance above terrain based on terrain slope
      const safeDistance = this.calculateSafeTokenDistance(tokenX, chunk)
      const tokenY = terrainHeight - safeDistance
      
      // Only spawn token if it's safely above terrain
      if (this.isTokenPositionSafe(tokenX, tokenY, chunk)) {
        const token = this.objectPools.tokenPool.get(tokenX, tokenY)
        chunk.tokens.push(token)
      }
    }
  }

  private createJumpArcTrail(chunk: LevelChunk): void {
    // Arc-shaped trail for jump collections - smoother and more predictable
    const numTokens = 5 // Fixed number for consistent trail
    const startX = chunk.x + 60
    const endX = chunk.x + chunk.width - 60
    const width = endX - startX
    
    const baseHeight = this.getTerrainHeightAtX(chunk.x + chunk.width / 2, chunk)
    const arcHeight = 80 // Reduced from 120 for lower, more accessible trail
    
    for (let i = 0; i < numTokens; i++) {
      const progress = i / (numTokens - 1) // 0 to 1
      const tokenX = startX + progress * width
      
      // Create smooth parabolic arc - lower overall for easier collection
      const arcProgress = 4 * progress * (1 - progress) // Parabola: peaks at 0.5
      
      // Make first and last coins ground-reachable (no jump required)
      let heightMultiplier
      if (i === 0 || i === numTokens - 1) {
        // First and last coins: very low, ground-reachable
        heightMultiplier = 0.1
      } else {
        // Middle coins: gradual arc but much lower than before
        heightMultiplier = 0.3 + (arcProgress * 0.4) // Scale from 0.3 to 0.7
      }
      
      const tokenY = baseHeight - 30 - (arcHeight * heightMultiplier) // Lowered base height from -50 to -30
      
      // Only spawn token if it's safely above terrain
      if (this.isTokenPositionSafe(tokenX, tokenY, chunk)) {
        const token = this.objectPools.tokenPool.get(tokenX, tokenY)
        chunk.tokens.push(token)
      }
    }
  }

  private createRampLaunchTrail(chunk: LevelChunk): void {
    // Trail that follows a ramp launch trajectory - more predictable
    if (!chunk.terrainPath || chunk.terrainPath.length < 3) {
      // Fallback to ground following if no terrain path
      this.createGroundFollowingTrail(chunk)
      return
    }
    
    const numTokens = 4 // Fixed number for consistent trail
    const launchPoint = chunk.x + chunk.width * 0.6 // Launch from earlier for better collection
    const launchHeight = this.getTerrainHeightAtX(launchPoint, chunk)
    
    for (let i = 0; i < numTokens; i++) {
      const progress = i / (numTokens - 1)
      const tokenX = launchPoint + progress * 180 // Slightly shorter trail for better following
      
      // Simulate realistic launch trajectory
      const horizontalDistance = progress * 180
      const initialVelocityY = -250 // Moderate launch velocity
      const gravity = 500
      const time = horizontalDistance / 350 // Match player's typical speed
      
      const trajectoryY = initialVelocityY * time + 0.5 * gravity * time * time
      const tokenY = launchHeight + trajectoryY
      
      // Only place tokens that are safely above terrain
      if (this.isTokenPositionSafe(tokenX, tokenY, chunk)) {
        const token = this.objectPools.tokenPool.get(tokenX, tokenY)
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

  private calculateSafeTokenDistance(x: number, chunk: LevelChunk): number {
    if (!chunk.terrainPath || chunk.terrainPath.length < 2) {
      return 60 // Increased default safe distance
    }
    
    // Calculate terrain slope at this position
    const terrainSlope = this.getTerrainSlopeAtX(x, chunk)
    const slopeAngle = Math.abs(Math.atan(terrainSlope))
    
    // Increased base distance and better slope handling
    const baseDistance = 60 // Increased from 40px
    const tokenRadius = GameSettings.tokens.size
    const slopeMultiplier = 1.2 + (slopeAngle / (Math.PI / 2)) // Scale from 1.2 to 2.2 based on steepness
    
    // Ensure minimum clearance accounts for token size plus safety margin
    const minimumClearance = tokenRadius + 45 // Token radius plus 45px safety
    return Math.max(baseDistance * slopeMultiplier, minimumClearance)
  }

  private getTerrainSlopeAtX(x: number, chunk: LevelChunk): number {
    if (!chunk.terrainPath || chunk.terrainPath.length < 2) {
      return 0
    }
    
    // Find the terrain segment containing this x position
    for (let i = 0; i < chunk.terrainPath.length - 1; i++) {
      const p1 = chunk.terrainPath[i]
      const p2 = chunk.terrainPath[i + 1]
      
      if (x >= p1.x && x <= p2.x) {
        // Calculate slope (rise/run)
        const rise = p2.y - p1.y
        const run = p2.x - p1.x
        return run !== 0 ? rise / run : 0
      }
    }
    
    return 0
  }

  private isTokenPositionSafe(tokenX: number, tokenY: number, chunk: LevelChunk): boolean {
    if (!chunk.terrainPath || chunk.terrainPath.length === 0) {
      return true // No terrain to collide with
    }
    
    const tokenRadius = GameSettings.tokens.size
    const minClearance = tokenRadius + 20 // Ensure full token radius plus extra safety margin
    
    // 1. Enhanced terrain collision detection - test more points around the token circumference
    const checkPoints = [
      { x: tokenX, y: tokenY }, // Center
      { x: tokenX - tokenRadius, y: tokenY }, // Left
      { x: tokenX + tokenRadius, y: tokenY }, // Right  
      { x: tokenX, y: tokenY + tokenRadius }, // Bottom
      { x: tokenX, y: tokenY - tokenRadius }, // Top
      // Add diagonal points for better coverage
      { x: tokenX - tokenRadius * 0.7, y: tokenY + tokenRadius * 0.7 }, // Bottom-left
      { x: tokenX + tokenRadius * 0.7, y: tokenY + tokenRadius * 0.7 }, // Bottom-right
      { x: tokenX - tokenRadius * 0.7, y: tokenY - tokenRadius * 0.7 }, // Top-left
      { x: tokenX + tokenRadius * 0.7, y: tokenY - tokenRadius * 0.7 }  // Top-right
    ]
    
    for (const point of checkPoints) {
      const terrainHeightAtPoint = this.getTerrainHeightAtX(point.x, chunk)
      
      // If any point is below terrain or within minimum clearance, position is unsafe
      if (point.y >= terrainHeightAtPoint - minClearance) {
        return false
      }
    }
    
    // 2. Additional safety check: ensure bottom of token is well above terrain
    const tokenBottomY = tokenY + tokenRadius
    const terrainHeightAtCenter = this.getTerrainHeightAtX(tokenX, chunk)
    if (tokenBottomY >= terrainHeightAtCenter - 15) { // Extra bottom clearance check
      return false
    }
    
    // 2. Check for overlap with existing tokens in this chunk and nearby chunks
    const minDistance = tokenRadius * 2.5 // Minimum distance between token centers (2.5x radius for good spacing)
    
    // Check tokens in current chunk
    for (const existingToken of chunk.tokens) {
      const dx = tokenX - existingToken.x
      const dy = tokenY - existingToken.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < minDistance) {
        return false // Too close to existing token
      }
    }
    
    // Check tokens in nearby chunks (to prevent cross-chunk overlaps)
    for (const nearbyChunk of this.chunks) {
      if (nearbyChunk === chunk) continue // Already checked above
      
      // Only check chunks that are close enough to matter
      const chunkDistance = Math.abs(nearbyChunk.x - chunk.x)
      if (chunkDistance > GameSettings.level.chunkWidth * 1.5) continue
      
      for (const existingToken of nearbyChunk.tokens) {
        const dx = tokenX - existingToken.x
        const dy = tokenY - existingToken.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < minDistance) {
          return false // Too close to existing token in nearby chunk
        }
      }
    }
    
    return true
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
          try { this.objectPools.tokenPool.release(token) } catch (error) { console.error("Token release error:", error) }
        })
        chunk.spikes.forEach(spike => {
          try { this.objectPools.spikePool.release(spike) } catch (error) { console.error("Spike release error:", error) }
        })
        chunk.platforms.forEach(platform => {
          try { this.objectPools.platformPool.release(platform) } catch (error) { console.error("Platform release error:", error) }
        })
        chunk.rails.forEach(rail => {
          try { this.objectPools.railPool.release(rail) } catch (error) { console.error("Rail release error:", error) }
        })
        chunk.rocks.forEach(rock => {
          try { this.objectPools.rockPool.release(rock) } catch (error) { console.error("Rock release error:", error) }
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

  public removeToken(token: Token): void {
    this.chunks.forEach(chunk => {
      const index = chunk.tokens.indexOf(token)
      if (index > -1) {
        chunk.tokens.splice(index, 1)
      }
    })
  }

  private addRocksToFlat(chunk: LevelChunk): void {
    // Check rock cooldown first (5 second spacing at ~400px/s = ~2000px = ~7 chunks)
    if (this.rockCooldown > 0) {
      this.rockCooldown-- // Decrement cooldown
      return // Still in cooldown
    }

    // 80% chance to spawn a rock on flat terrain (for testing)
    if (Math.random() > 0.8) {
      return // No rock this time
    }

    if (!chunk.terrainPath || chunk.terrainPath.length < 2) {
      return // No terrain path to place rock on
    }

    // Find a good position for the rock (center area of chunk)
    const startIndex = Math.floor(chunk.terrainPath.length * 0.3)
    const endIndex = Math.floor(chunk.terrainPath.length * 0.7)
    const rockIndex = startIndex + Math.floor(Math.random() * (endIndex - startIndex))
    const rockPosition = chunk.terrainPath[rockIndex]

    // Place rock on the ground surface
    const rockX = rockPosition.x
    const rockY = rockPosition.y // Rock sits on terrain surface

    const rock = this.objectPools.rockPool.get(rockX, rockY)
    chunk.rocks.push(rock)

    // Set cooldown to prevent next rock for ~5 seconds (7 chunks at 300px each)
    this.rockCooldown = 7

    console.log(`🪨 Rock spawned at (${rockX.toFixed(0)}, ${rockY.toFixed(0)}) on flat terrain - cooldown set to 7 chunks`)
  }

  private guaranteeRailSpawn(chunk: LevelChunk): void {
    // This method ensures a rail is ALWAYS spawned on dedicated rail terrain
    if (!chunk.terrainPath || chunk.terrainPath.length < 2) {
      console.log("No terrain path available for guaranteed rail spawn")
      return
    }

    // Find the optimal position for the rail (middle section of the chunk)
    const midIndex = Math.floor(chunk.terrainPath.length / 2)
    const railPosition = chunk.terrainPath[midIndex]
    
    // Position rail close to terrain for easy grinding
    const railX = railPosition.x
    const railY = railPosition.y - 30 // Place 30px above terrain
    
    const rail = this.objectPools.railPool.get(railX, railY)
    
    // Match rail rotation to terrain angle for natural placement
    let railRotation = 0
    if (midIndex > 0) {
      const prevPoint = chunk.terrainPath[midIndex - 1]
      const nextPoint = chunk.terrainPath[Math.min(midIndex + 1, chunk.terrainPath.length - 1)]
      
      // Calculate slope angle from surrounding terrain points
      railRotation = Math.atan2(nextPoint.y - prevPoint.y, nextPoint.x - prevPoint.x)
      rail.rotation = railRotation
      
      console.log(`📐 RAIL ROTATION CALC:`)
      console.log(`  - PrevPoint: (${prevPoint.x.toFixed(0)}, ${prevPoint.y.toFixed(0)})`)
      console.log(`  - RailPoint: (${railPosition.x.toFixed(0)}, ${railPosition.y.toFixed(0)})`)
      console.log(`  - NextPoint: (${nextPoint.x.toFixed(0)}, ${nextPoint.y.toFixed(0)})`)
      console.log(`  - Calculated rotation: ${railRotation.toFixed(3)} radians (${(railRotation * 180 / Math.PI).toFixed(1)} degrees)`)
    }
    
    chunk.rails.push(rail)
    
    console.log(`🟣 GUARANTEED RAIL spawned at (${railX.toFixed(0)}, ${railY.toFixed(0)}) with rotation ${railRotation.toFixed(3)}`)
    console.log(`🟣 RAIL DETAILS: centerX=${railX} centerY=${railY} rotation=${railRotation.toFixed(3)} terrainAngle=${(railRotation * 180 / Math.PI).toFixed(1)}°`)
    console.log(`🟣 RAIL ADDED TO CHUNK: Total rails in game: ${this.getRails().length}`)
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

  public getRails(): Rail[] {
    const rails: Rail[] = []
    this.chunks.forEach(chunk => {
      rails.push(...chunk.rails)
    })
    return rails
  }

  public getRocks(): Rock[] {
    const rocks: Rock[] = []
    this.chunks.forEach(chunk => {
      rocks.push(...chunk.rocks)
    })
    return rocks
  }

  public getChunks(): LevelChunk[] {
    return [...this.chunks]
  }

  private addDebugHitboxes(chunk: LevelChunk): void {
    // Show all hitboxes with different colors for each object type
    
    // 1. TOKENS - Yellow circles
    chunk.tokens.forEach(token => {
      const tokenHitbox = this.scene.add.graphics()
      tokenHitbox.lineStyle(2, 0xFFFF00, 0.8) // Bright yellow
      tokenHitbox.fillStyle(0xFFFF00, 0.1) // Semi-transparent yellow fill
      tokenHitbox.strokeCircle(token.x, token.y, 15) // Token radius
      tokenHitbox.fillCircle(token.x, token.y, 15)
      
      const tokenLabel = this.scene.add.text(token.x, token.y - 25, 'TOKEN', {
        fontSize: '5px',
        color: '#FFFF00',
        backgroundColor: '#000000',
        fontFamily: '"Press Start 2P", monospace'
      })
      tokenLabel.setOrigin(0.5, 0.5)
    })
    
    // 2. SPIKES - Red rectangles  
    chunk.spikes.forEach(spike => {
      const spikeHitbox = this.scene.add.graphics()
      spikeHitbox.lineStyle(2, 0xFF0000, 0.8) // Bright red
      spikeHitbox.fillStyle(0xFF0000, 0.15) // Semi-transparent red fill
      spikeHitbox.strokeRect(spike.x - 15, spike.y - 15, 30, 30) // Spike size
      spikeHitbox.fillRect(spike.x - 15, spike.y - 15, 30, 30)
      
      const spikeLabel = this.scene.add.text(spike.x, spike.y - 30, 'SPIKE', {
        fontSize: '5px',
        color: '#FF0000',
        backgroundColor: '#000000',
        fontFamily: '"Press Start 2P", monospace'
      })
      spikeLabel.setOrigin(0.5, 0.5)
    })
    
    // 3. MOVING PLATFORMS - Purple rectangles
    chunk.platforms.forEach(platform => {
      const platformHitbox = this.scene.add.graphics()
      platformHitbox.lineStyle(2, 0xFF00FF, 0.8) // Magenta
      platformHitbox.fillStyle(0xFF00FF, 0.1) // Semi-transparent magenta fill
      platformHitbox.strokeRect(platform.x - 50, platform.y - 10, 100, 20) // Platform size
      platformHitbox.fillRect(platform.x - 50, platform.y - 10, 100, 20)
      
      const platformLabel = this.scene.add.text(platform.x, platform.y - 25, 'PLATFORM', {
        fontSize: '5px',
        color: '#FF00FF',
        backgroundColor: '#000000',
        fontFamily: '"Press Start 2P", monospace'
      })
      platformLabel.setOrigin(0.5, 0.5)
    })
    
    // 4. RAILS - Already have green/cyan outlines, but add extra info
    chunk.rails.forEach((rail, index) => {
      // Rails already have debug visuals, just add extra info
      const railInfoLabel = this.scene.add.text(rail.x, rail.y - 50, `RAIL ${index}\\n300x15px`, {
        fontSize: '6px',
        color: '#00FF00',
        backgroundColor: '#000000',
        align: 'center',
        fontFamily: '"Press Start 2P", monospace'
      })
      railInfoLabel.setOrigin(0.5, 0.5)
    })
    
    // 5. TERRAIN PHYSICS BODIES - Blue outlines (if they exist)
    if (chunk.terrainPath && chunk.terrainPath.length > 1) {
      const terrainHitbox = this.scene.add.graphics()
      terrainHitbox.lineStyle(1, 0x0080FF, 0.6) // Blue
      
      // Draw terrain collision outline
      terrainHitbox.beginPath()
      terrainHitbox.moveTo(chunk.terrainPath[0].x, chunk.terrainPath[0].y)
      
      for (let i = 1; i < chunk.terrainPath.length; i++) {
        terrainHitbox.lineTo(chunk.terrainPath[i].x, chunk.terrainPath[i].y)
      }
      
      terrainHitbox.strokePath()
      
      // Add terrain label
      const midPoint = chunk.terrainPath[Math.floor(chunk.terrainPath.length / 2)]
      const terrainLabel = this.scene.add.text(midPoint.x, midPoint.y - 20, 'TERRAIN', {
        fontSize: '5px',
        color: '#0080FF',
        backgroundColor: '#000000',
        fontFamily: '"Press Start 2P", monospace'
      })
      terrainLabel.setOrigin(0.5, 0.5)
    }
    
    console.log(`🎯 DEBUG HITBOXES: Added for chunk with ${chunk.tokens.length} tokens, ${chunk.spikes.length} spikes, ${chunk.platforms.length} platforms, ${chunk.rails.length} rails`)
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
        try { this.objectPools.tokenPool.release(token) } catch (error) { console.error("Token release error in main destroy:", error) }
      })
      chunk.spikes.forEach(spike => {
        try { this.objectPools.spikePool.release(spike) } catch (error) { console.error("Spike release error in main destroy:", error) }
      })
      chunk.platforms.forEach(platform => {
        try { this.objectPools.platformPool.release(platform) } catch (error) { console.error("Platform release error in main destroy:", error) }
      })
      chunk.rails.forEach(rail => {
        try { this.objectPools.railPool.release(rail) } catch (error) { console.error("Rail release error in main destroy:", error) }
      })
      chunk.rocks.forEach(rock => {
        try { this.objectPools.rockPool.release(rock) } catch (error) { console.error("Rock release error in main destroy:", error) }
      })
    })
    this.chunks = []
  }

  private addSnowTexture(terrain: Phaser.GameObjects.Graphics, smoothedPoints: {x: number, y: number}[], x: number, width: number): void {
    // Add subtle snow sparkles and texture
    terrain.fillStyle(0xFFFFFF, 0.3) // Semi-transparent white sparkles
    
    for (let i = 0; i < 15; i++) {
      const sparkleX = x + (Math.random() * width)
      const sparkleY = this.getHeightAtX(sparkleX, smoothedPoints) - Math.random() * 20
      const sparkleSize = 1 + Math.random() * 2
      
      terrain.fillCircle(sparkleX, sparkleY, sparkleSize)
    }
    
    // Add some snow drift lines for texture
    terrain.lineStyle(1, 0xF5F5F5, 0.4) // Very light gray, semi-transparent
    
    for (let i = 0; i < 8; i++) {
      const lineX = x + (Math.random() * width)
      const lineY = this.getHeightAtX(lineX, smoothedPoints) - Math.random() * 15
      const lineLength = 5 + Math.random() * 15
      
      terrain.lineBetween(lineX, lineY, lineX + lineLength, lineY + Math.random() * 3 - 1.5)
    }
  }

  private addSnowDetails(terrain: Phaser.GameObjects.Graphics, smoothedPoints: {x: number, y: number}[], x: number, width: number): void {
    // Add small snow bumps and variations
    terrain.fillStyle(0xF8F8FF, 0.6) // Semi-transparent snow white
    
    for (let i = 0; i < 6; i++) {
      const bumpX = x + (Math.random() * width)
      const bumpY = this.getHeightAtX(bumpX, smoothedPoints)
      const bumpSize = 3 + Math.random() * 5
      
      // Create small oval snow bumps
      terrain.fillEllipse(bumpX, bumpY - bumpSize/2, bumpSize, bumpSize * 0.6)
    }
    
    // Add subtle shadow effects near the surface
    terrain.fillStyle(0xE6E6FA, 0.2) // Very light lavender shadow
    
    for (let i = 1; i < smoothedPoints.length; i++) {
      const point = smoothedPoints[i]
      if (Math.random() < 0.3) { // 30% chance for shadow
        terrain.fillEllipse(point.x, point.y + 2, 8, 3) // Small shadow beneath surface
      }
    }
  }

  private getHeightAtX(targetX: number, points: {x: number, y: number}[]): number {
    // Find height at specific X coordinate by interpolating between points
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      
      if (targetX >= p1.x && targetX <= p2.x) {
        const t = (targetX - p1.x) / (p2.x - p1.x)
        return p1.y + t * (p2.y - p1.y)
      }
    }
    return points[points.length - 1].y // Default to last point
  }

}