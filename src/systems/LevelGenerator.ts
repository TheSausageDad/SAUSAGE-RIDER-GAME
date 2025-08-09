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

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.generateInitialChunks()
  }

  private generateInitialChunks(): void {
    // Generate starting flat ground
    this.generateChunk(0, true)
    
    // Generate several chunks ahead
    for (let i = 1; i < 5; i++) {
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
      // Starting chunk: flat ground only
      this.createFlatGround(chunk, x, chunkWidth)
    } else {
      // Random terrain generation
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

  private createFlatGround(chunk: LevelChunk, x: number, width: number): void {
    const groundHeight = 50
    const groundY = GameSettings.level.groundY
    
    // Create terrain path
    chunk.terrainPath = [
      { x: x, y: groundY },
      { x: x + width, y: groundY }
    ]
    
    // Visual ground
    const groundGraphics = this.scene.add.graphics()
    groundGraphics.fillStyle(0x444444)
    groundGraphics.lineStyle(3, 0x00FF00) // Green outline
    groundGraphics.fillRect(x, groundY, width, groundHeight)
    groundGraphics.strokeRect(x, groundY, width, groundHeight)
    
    // Create smooth Matter physics body using rectangle for flat ground
    const ground = this.scene.add.rectangle(
      x + width / 2, 
      groundY + groundHeight / 2, 
      width + 4,
      groundHeight, 
      0x444444, 0
    )
    
    // Add Matter physics and make it static
    this.scene.matter.add.gameObject(ground, { isStatic: true })
    
    chunk.ramps.push(groundGraphics)
    chunk.ground.push(ground)
  }

  private generateTerrainForChunk(chunk: LevelChunk, x: number, width: number): void {
    const terrainType = Math.random()
    
    if (terrainType < 0.3) {
      // Flat ground - more common for speed building
      this.createFlatGround(chunk, x, width)
    } else if (terrainType < 0.5) {
      // Gentle ramp for easier climbing
      this.createGentleRamp(chunk, x, width)
    } else if (terrainType < 0.75) {
      // Half-pipe (curved dip)
      this.createHalfPipe(chunk, x, width)
    } else {
      // Hill (curved jump)
      this.createHill(chunk, x, width)
    }
  }

  private createGentleRamp(chunk: LevelChunk, x: number, width: number): void {
    const groundHeight = 50
    const groundY = GameSettings.level.groundY
    const rampHeight = 80
    
    // Create smooth terrain path for ramp
    const pathPoints = []
    const numPoints = 20
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints
      const pointX = x + (width * progress)
      let pointY = groundY
      
      // Smooth ramp curve
      if (progress < 0.33) {
        pointY = groundY - (rampHeight/2) * (progress / 0.33)
      } else if (progress < 0.67) {
        pointY = groundY - rampHeight/2 - (rampHeight/2) * ((progress - 0.33) / 0.34)
      } else {
        pointY = groundY - rampHeight + (rampHeight/2) * ((progress - 0.67) / 0.33)
      }
      
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    chunk.terrainPath = pathPoints
    
    // Visual ramp
    const ramp = this.scene.add.graphics()
    ramp.fillStyle(0x444444)
    ramp.lineStyle(3, 0xFF00FF)
    
    ramp.beginPath()
    ramp.moveTo(pathPoints[0].x, pathPoints[0].y)
    
    // Draw smooth curve
    pathPoints.forEach((point, index) => {
      if (index > 0) {
        ramp.lineTo(point.x, point.y)
      }
    })
    
    // Complete the shape
    ramp.lineTo(x + width, groundY + groundHeight)
    ramp.lineTo(x, groundY + groundHeight)
    ramp.closePath()
    ramp.fillPath()
    ramp.strokePath()
    
    // Create single smooth Matter physics body using vertices
    const vertices = []
    
    // Add terrain surface points
    pathPoints.forEach(point => {
      vertices.push({ x: point.x - x - width/2, y: point.y - groundY - groundHeight/2 })
    })
    
    // Add bottom points to close the shape
    vertices.push({ x: width/2, y: groundHeight/2 })
    vertices.push({ x: -width/2, y: groundHeight/2 })
    
    const ground = this.scene.add.polygon(
      x + width / 2,
      groundY + groundHeight / 2,
      vertices,
      0x444444, 0
    )
    
    this.scene.matter.add.gameObject(ground, { 
      isStatic: true,
      shape: {
        type: 'fromVerts',
        verts: vertices
      }
    })
    
    chunk.ramps.push(ramp)
    chunk.ground.push(ground)
  }

  private createHalfPipe(chunk: LevelChunk, x: number, width: number): void {
    const groundHeight = 50
    const groundY = GameSettings.level.groundY
    const pipeDepth = 100
    
    // Create smooth terrain path for half-pipe
    const pathPoints = []
    const numPoints = 24
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints
      const pointX = x + (width * progress)
      const pointY = groundY + (Math.sin(progress * Math.PI) * pipeDepth)
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    chunk.terrainPath = pathPoints
    
    // Visual half-pipe
    const pipe = this.scene.add.graphics()
    pipe.fillStyle(0x444444)
    pipe.lineStyle(3, 0x00FFFF)
    
    pipe.beginPath()
    pipe.moveTo(pathPoints[0].x, pathPoints[0].y)
    
    // Draw smooth curve
    pathPoints.forEach((point, index) => {
      if (index > 0) {
        pipe.lineTo(point.x, point.y)
      }
    })
    
    // Complete the shape
    pipe.lineTo(x + width, groundY + groundHeight)
    pipe.lineTo(x, groundY + groundHeight)
    pipe.closePath()
    pipe.fillPath()
    pipe.strokePath()
    
    // Create smooth Matter physics body
    const vertices = []
    
    // Add terrain surface points
    pathPoints.forEach(point => {
      vertices.push({ x: point.x - x - width/2, y: point.y - groundY - groundHeight/2 })
    })
    
    // Add bottom points to close the shape
    vertices.push({ x: width/2, y: groundHeight/2 })
    vertices.push({ x: -width/2, y: groundHeight/2 })
    
    const ground = this.scene.add.polygon(
      x + width / 2,
      groundY + groundHeight / 2,
      vertices,
      0x444444, 0
    )
    
    this.scene.matter.add.gameObject(ground, { 
      isStatic: true,
      shape: {
        type: 'fromVerts',
        verts: vertices
      }
    })
    
    chunk.ramps.push(pipe)
    chunk.ground.push(ground)
  }

  private createHill(chunk: LevelChunk, x: number, width: number): void {
    const groundHeight = 50
    const groundY = GameSettings.level.groundY
    const hillHeight = 120
    
    // Create smooth terrain path for hill
    const pathPoints = []
    const numPoints = 24
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints
      const pointX = x + (width * progress)
      
      // Create gentler slope at start and end
      let heightMultiplier = Math.sin(progress * Math.PI)
      if (progress < 0.2) {
        heightMultiplier *= (progress / 0.2) * 0.7
      } else if (progress > 0.8) {
        heightMultiplier *= ((1 - progress) / 0.2) * 0.7
      }
      
      const pointY = groundY - (heightMultiplier * hillHeight)
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    chunk.terrainPath = pathPoints
    
    // Visual hill
    const hill = this.scene.add.graphics()
    hill.fillStyle(0x444444)
    hill.lineStyle(3, 0xFFFF00)
    
    hill.beginPath()
    hill.moveTo(pathPoints[0].x, pathPoints[0].y)
    
    // Draw smooth curve
    pathPoints.forEach((point, index) => {
      if (index > 0) {
        hill.lineTo(point.x, point.y)
      }
    })
    
    // Complete the shape
    hill.lineTo(x + width, groundY + groundHeight)
    hill.lineTo(x, groundY + groundHeight)
    hill.closePath()
    hill.fillPath()
    hill.strokePath()
    
    // Create smooth Matter physics body
    const vertices = []
    
    // Add terrain surface points
    pathPoints.forEach(point => {
      vertices.push({ x: point.x - x - width/2, y: point.y - groundY - groundHeight/2 })
    })
    
    // Add bottom points to close the shape
    vertices.push({ x: width/2, y: groundHeight/2 })
    vertices.push({ x: -width/2, y: groundHeight/2 })
    
    const ground = this.scene.add.polygon(
      x + width / 2,
      groundY + groundHeight / 2,
      vertices,
      0x444444, 0
    )
    
    this.scene.matter.add.gameObject(ground, { 
      isStatic: true,
      shape: {
        type: 'fromVerts',
        verts: vertices
      }
    })
    
    chunk.ramps.push(hill)
    chunk.ground.push(ground)
  }

  private createDip(chunk: LevelChunk, x: number, width: number): void {
    const groundHeight = 50
    const groundY = GameSettings.level.groundY
    const dipDepth = 60
    
    // Create smooth terrain path for dip
    const pathPoints = []
    const numPoints = 16
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints
      const pointX = x + (width * progress)
      let pointY = groundY
      
      // Smooth dip curve
      if (progress < 0.25) {
        pointY = groundY + (dipDepth * (progress / 0.25))
      } else if (progress < 0.75) {
        pointY = groundY + dipDepth
      } else {
        const upProgress = (progress - 0.75) / 0.25
        pointY = groundY + dipDepth - (dipDepth * upProgress)
      }
      
      pathPoints.push({ x: pointX, y: pointY })
    }
    
    chunk.terrainPath = pathPoints
    
    // Visual dip
    const dip = this.scene.add.graphics()
    dip.fillStyle(0x444444)
    dip.lineStyle(3, 0x0000FF)
    
    dip.beginPath()
    dip.moveTo(pathPoints[0].x, pathPoints[0].y)
    
    pathPoints.forEach((point, index) => {
      if (index > 0) {
        dip.lineTo(point.x, point.y)
      }
    })
    
    // Complete the shape
    dip.lineTo(x + width, groundY + groundHeight)
    dip.lineTo(x, groundY + groundHeight)
    dip.closePath()
    dip.fillPath()
    dip.strokePath()
    
    // Create smooth Matter physics body
    const vertices = []
    
    pathPoints.forEach(point => {
      vertices.push({ x: point.x - x - width/2, y: point.y - groundY - groundHeight/2 })
    })
    
    vertices.push({ x: width/2, y: groundHeight/2 })
    vertices.push({ x: -width/2, y: groundHeight/2 })
    
    const ground = this.scene.add.polygon(
      x + width / 2,
      groundY + groundHeight / 2,
      vertices,
      0x444444, 0
    )
    
    this.scene.matter.add.gameObject(ground, { 
      isStatic: true,
      shape: {
        type: 'fromVerts',
        verts: vertices
      }
    })
    
    chunk.ramps.push(dip)
    chunk.ground.push(ground)
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
    // Add 1-3 tokens per chunk
    const numTokens = Math.floor(Math.random() * 3) + 1
    
    for (let i = 0; i < numTokens; i++) {
      if (Math.random() < GameSettings.tokens.spawnRate) {
        const tokenX = chunk.x + (i + 1) * (chunk.width / (numTokens + 1))
        const tokenY = GameSettings.level.groundY - 100 - Math.random() * 200
        
        const token = new Token(this.scene, tokenX, tokenY)
        chunk.tokens.push(token)
      }
    }
  }

  public update(cameraX: number): void {
    // Generate new chunks ahead of camera
    const viewDistance = GameSettings.canvas.width * 2
    while (this.nextChunkX < cameraX + viewDistance) {
      this.generateChunk(this.nextChunkX)
    }

    // Remove chunks that are far behind camera
    const cleanupDistance = GameSettings.canvas.width
    this.chunks = this.chunks.filter(chunk => {
      if (chunk.x + chunk.width < cameraX - cleanupDistance) {
        // Clean up game objects
        chunk.ground.forEach(ground => ground.destroy())
        chunk.ramps.forEach(ramp => ramp.destroy())
        chunk.tokens.forEach(token => token.destroy())
        chunk.spikes.forEach(spike => spike.destroy())
        chunk.platforms.forEach(platform => platform.destroy())
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

  public destroy(): void {
    this.chunks.forEach(chunk => {
      chunk.ground.forEach(ground => ground.destroy())
      chunk.ramps.forEach(ramp => ramp.destroy())
      chunk.tokens.forEach(token => token.destroy())
      chunk.spikes.forEach(spike => spike.destroy())
      chunk.platforms.forEach(platform => platform.destroy())
    })
    this.chunks = []
  }
}