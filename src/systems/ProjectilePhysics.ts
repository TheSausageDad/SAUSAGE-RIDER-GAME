/**
 * Projectile Physics System
 * Based on the reference projectile game mechanics
 */

export interface TrajectoryPoint {
  x: number
  y: number
  time: number
}

export class ProjectilePhysics {
  public gravity: number = 9.8
  public velocity: number = 80
  public angle: number = Math.PI / 3 // 60 degrees
  
  constructor(velocity: number = 80, angle: number = Math.PI / 3, gravity: number = 9.8) {
    this.velocity = velocity
    this.angle = angle
    this.gravity = Math.max(gravity, 0.1) // Prevent division by zero
  }

  /**
   * Calculate the time of flight for the projectile
   */
  public getTimeOfFlight(): number {
    const verticalComponent = this.velocity * Math.sin(this.angle)
    return (2 * verticalComponent) / this.gravity
  }

  /**
   * Calculate the horizontal range of the projectile
   */
  public getRange(): number {
    return (this.velocity * this.velocity * Math.sin(2 * this.angle)) / this.gravity
  }

  /**
   * Calculate the maximum height of the projectile
   */
  public getMaxHeight(): number {
    const verticalComponent = this.velocity * Math.sin(this.angle)
    return (verticalComponent * verticalComponent) / (2 * this.gravity)
  }

  /**
   * Get trajectory coordinates for the projectile path
   */
  public getTrajectoryPoints(numPoints: number = 60, startX: number = 0, startY: number = 0): TrajectoryPoint[] {
    const timeOfFlight = this.getTimeOfFlight()
    const timeStep = timeOfFlight / numPoints
    const points: TrajectoryPoint[] = []

    for (let i = 0; i <= numPoints; i++) {
      const t = i * timeStep
      const x = startX + this.velocity * Math.cos(this.angle) * t
      const y = startY - (this.velocity * Math.sin(this.angle) * t - 0.5 * this.gravity * t * t)
      
      points.push({ x, y, time: t })
    }

    return points
  }

  /**
   * Get position at specific time
   */
  public getPositionAtTime(time: number, startX: number = 0, startY: number = 0): { x: number, y: number } {
    const x = startX + this.velocity * Math.cos(this.angle) * time
    const y = startY - (this.velocity * Math.sin(this.angle) * time - 0.5 * this.gravity * time * time)
    
    return { x, y }
  }

  /**
   * Get velocity components at specific time
   */
  public getVelocityAtTime(time: number): { vx: number, vy: number } {
    const vx = this.velocity * Math.cos(this.angle)
    const vy = this.velocity * Math.sin(this.angle) - this.gravity * time
    
    return { vx, vy }
  }

  /**
   * Update projectile parameters
   */
  public updateParameters(velocity?: number, angle?: number, gravity?: number): void {
    if (velocity !== undefined) this.velocity = velocity
    if (angle !== undefined) this.angle = angle
    if (gravity !== undefined) this.gravity = Math.max(gravity, 0.1)
  }
}