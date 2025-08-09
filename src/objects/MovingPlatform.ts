import GameSettings from "../config/GameSettings"

export class MovingPlatform extends Phaser.GameObjects.Container {
  public body!: MatterJS.Body
  private platformSprite!: Phaser.GameObjects.Rectangle
  private startY: number
  private targetY: number
  private moveSpeed: number
  private direction: number = -1 // -1 for up, 1 for down
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)
    
    this.startY = y
    this.targetY = y - GameSettings.level.platformHeight * 2 // Move up by default
    this.moveSpeed = GameSettings.obstacles.platformSpeed
    
    this.createSprite()
    
    scene.add.existing(this)
    this.setupPhysics()
  }

  private createSprite(): void {
    const width = 120
    const height = 20
    
    // Main platform
    this.platformSprite = this.scene.add.rectangle(0, 0, width, height, 0x666666)
    this.platformSprite.setStrokeStyle(2, 0x888888)
    
    // Add some detail to make it look mechanical
    const leftSupport = this.scene.add.rectangle(-width/3, height/2 + 5, 8, 10, 0x444444)
    const rightSupport = this.scene.add.rectangle(width/3, height/2 + 5, 8, 10, 0x444444)
    
    // Add elevator shaft indicators
    const leftIndicator = this.scene.add.circle(-width/2 + 10, 0, 3, 0x00FF00) // Green indicator
    const rightIndicator = this.scene.add.circle(width/2 - 10, 0, 3, 0xFF0000) // Red indicator
    
    this.add([this.platformSprite, leftSupport, rightSupport, leftIndicator, rightIndicator])
  }

  private setupPhysics(): void {
    // Create Matter physics body for platform
    this.body = this.scene.matter.add.rectangle(
      this.x, this.y, 120, 20,
      {
        isStatic: false, // Allow movement
        mass: 10, // Heavy so motorcycle doesn't push it around
        friction: 0.8, // Good friction for standing on
        label: 'platform'
      }
    )
    
    // Link to game object
    this.scene.matter.add.gameObject(this, this.body)
    
    // Start moving up
    const Matter = (this.scene.matter as any).Matter
    Matter.Body.setVelocity(this.body, { x: 0, y: -this.moveSpeed * 0.01 })
  }

  public update(deltaTime: number): void {
    const Matter = (this.scene.matter as any).Matter
    
    // Elevator-style movement - only goes up
    if (this.y <= this.targetY) {
      // Reached the top, stay there for a moment then reset
      Matter.Body.setVelocity(this.body, { x: 0, y: 0 })
      
      // After a short delay, teleport back to start position
      this.scene.time.delayedCall(2000, () => {
        Matter.Body.setPosition(this.body, { x: this.x, y: this.startY })
        Matter.Body.setVelocity(this.body, { x: 0, y: -this.moveSpeed * 0.01 })
      })
    }
  }

  public getBody(): MatterJS.Body {
    return this.body
  }

  public destroy(): void {
    super.destroy()
  }
}