/**
 * Dynamic Terrain System
 * Based on the reference projectile game's floor mechanics
 */

export interface TerrainPoint {
  x: number
  y: number
}

export class DynamicTerrain {
  private scene: Phaser.Scene
  private points: TerrainPoint[] = []
  private graphics!: Phaser.GameObjects.Graphics
  private baseY: number
  private scrollSpeed: number = 6
  private terrainWidth: number
  private amplitude: number = 100
  private frequency: number = 0.01
  private offset: number = 0

  // Predefined topology patterns (similar to reference)
  private static topologies = {
    flat: (x: number) => 0,
    hills: (x: number) => Math.sin(x * 0.005) * 50,
    mountains: (x: number) => Math.sin(x * 0.003) * 80 + Math.sin(x * 0.01) * 30,
    valley: (x: number) => -Math.abs(Math.sin(x * 0.004)) * 60,
    waves: (x: number) => Math.sin(x * 0.008) * 40 + Math.cos(x * 0.012) * 20
  }

  private currentTopology: keyof typeof DynamicTerrain.topologies = 'hills'

  constructor(scene: Phaser.Scene, baseY: number = 400, width: number = 1000) {
    this.scene = scene
    this.baseY = baseY
    this.terrainWidth = width

    this.graphics = scene.add.graphics()
    this.graphics.setDepth(-1) // Behind other objects

    this.initializeTerrain()
  }

  private initializeTerrain(): void {
    // Generate initial terrain points
    for (let x = 0; x <= this.terrainWidth + 100; x += 10) {
      const y = this.baseY + DynamicTerrain.topologies[this.currentTopology](x + this.offset)
      this.points.push({ x, y })
    }
  }

  public update(shouldScroll: boolean = false): void {
    // Only scroll terrain when motorcycle is in flight
    if (shouldScroll) {
      this.offset += this.scrollSpeed
      
      // Remove points that have moved off screen (left side)
      this.points = this.points.filter(point => point.x > -100)
      
      // Add new points to the right
      while (this.points.length < (this.terrainWidth / 10) + 20) {
        const lastPoint = this.points[this.points.length - 1]
        const newX = lastPoint ? lastPoint.x + 10 : this.terrainWidth
        const newY = this.baseY + DynamicTerrain.topologies[this.currentTopology](newX + this.offset)
        
        this.points.push({ x: newX, y: newY })
      }
    }

    this.render()
  }

  private render(): void {
    this.graphics.clear()
    
    if (this.points.length < 2) return

    // Draw terrain fill
    this.graphics.fillStyle(0x4a5d23) // Dark green
    this.graphics.lineStyle(3, 0x7fb800) // Bright green outline
    
    this.graphics.beginPath()
    this.graphics.moveTo(this.points[0].x, this.points[0].y)
    
    // Draw terrain surface
    for (let i = 1; i < this.points.length; i++) {
      this.graphics.lineTo(this.points[i].x, this.points[i].y)
    }
    
    // Complete the shape (fill to bottom)
    const lastPoint = this.points[this.points.length - 1]
    this.graphics.lineTo(lastPoint.x, this.scene.cameras.main.height)
    this.graphics.lineTo(this.points[0].x, this.scene.cameras.main.height)
    this.graphics.closePath()
    
    this.graphics.fillPath()
    this.graphics.strokePath()
  }

  /**
   * Get terrain height at specific x coordinate
   */
  public getHeightAtX(x: number): number {
    // Find the two nearest points
    let leftPoint = this.points[0]
    let rightPoint = this.points[this.points.length - 1]

    for (let i = 0; i < this.points.length - 1; i++) {
      if (this.points[i].x <= x && this.points[i + 1].x >= x) {
        leftPoint = this.points[i]
        rightPoint = this.points[i + 1]
        break
      }
    }

    // Linear interpolation between the two points
    if (leftPoint === rightPoint) {
      return leftPoint.y
    }

    const t = (x - leftPoint.x) / (rightPoint.x - leftPoint.x)
    return leftPoint.y + t * (rightPoint.y - leftPoint.y)
  }

  /**
   * Get terrain slope angle at specific x coordinate
   */
  public getSlopeAngleAtX(x: number): number {
    // Find the two nearest points
    let leftPoint = this.points[0]
    let rightPoint = this.points[this.points.length - 1]

    for (let i = 0; i < this.points.length - 1; i++) {
      if (this.points[i].x <= x && this.points[i + 1].x >= x) {
        leftPoint = this.points[i]
        rightPoint = this.points[i + 1]
        break
      }
    }

    // Calculate slope angle
    if (leftPoint === rightPoint) {
      return 0
    }

    const deltaY = rightPoint.y - leftPoint.y
    const deltaX = rightPoint.x - leftPoint.x
    
    // Return angle in radians
    return Math.atan2(deltaY, deltaX)
  }

  /**
   * Check if a point is below the terrain
   */
  public isPointBelowTerrain(x: number, y: number): boolean {
    const terrainHeight = this.getHeightAtX(x)
    return y > terrainHeight
  }

  /**
   * Change terrain topology
   */
  public setTopology(topology: keyof typeof DynamicTerrain.topologies): void {
    this.currentTopology = topology
  }

  /**
   * Set scroll speed
   */
  public setScrollSpeed(speed: number): void {
    this.scrollSpeed = speed
  }

  /**
   * Get all terrain points for collision detection
   */
  public getPoints(): TerrainPoint[] {
    return [...this.points]
  }

  public destroy(): void {
    this.graphics.destroy()
  }
}