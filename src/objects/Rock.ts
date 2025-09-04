import GameSettings from "../config/GameSettings"
import { Poolable } from "../systems/ObjectPool"

export class Rock extends Phaser.GameObjects.Container implements Poolable {
  public body!: MatterJS.Body
  private rockSprite!: Phaser.GameObjects.Image
  public isActive: boolean = true

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)
    
    // Add container to scene
    scene.add.existing(this as any)
    
    // Set depth to be above terrain but below player
    this.setDepth(50)
    
    this.createSprite()
    this.setupPhysics()
  }

  private createSprite(): void {
    // Use your custom rock image
    this.rockSprite = this.scene.add.image(0, 15, 'rock') // Push down 15px to sit on terrain surface
    this.rockSprite.setOrigin(0.5, 1.0) // Center horizontally, bottom at ground level
    this.rockSprite.setScale(0.0792) // 25% smaller than 0.1056 (0.1056 * 0.75)
    this.add(this.rockSprite)
    
    console.log(`Created rock sprite at (${this.x}, ${this.y})`)
  }

  private setupPhysics(): void {
    // Create physics body for collision detection - scaled to match visual size
    const rockWidth = 25  // Smaller collision box for easier jumping
    const rockHeight = 20 // Smaller collision box for easier jumping
    
    // Calculate physics body position to align with visual sprite
    // Visual sprite is at (0, 15) relative to container, so physics should match
    const physicsOffsetY = 15 - rockHeight/2 // Align physics body center with visual bottom
    
    // Create rectangular collision body
    this.scene.matter.add.gameObject(this, {
      isStatic: true, // Rock doesn't move
      isSensor: false, // Solid collision
      label: 'rock',
      shape: {
        type: 'rectangle',
        width: rockWidth,
        height: rockHeight
      }
    })
    
    // Position the physics body to match visual sprite exactly
    if (this.body) {
      this.scene.matter.body.setPosition(this.body, { x: this.x, y: this.y + physicsOffsetY })
    }
    
    console.log(`Setup rock physics body at (${this.x}, ${this.y + physicsOffsetY}) to align with visual sprite`)
  }

  public reset(x: number, y: number): void {
    this.setPosition(x, y)
    this.isActive = true
    this.setVisible(true)
    this.setActive(true)
    
    // Update physics body position using same calculation as setupPhysics
    const rockHeight = 20
    const physicsOffsetY = 15 - rockHeight/2 // Match setupPhysics calculation
    
    if (this.body) {
      this.scene.matter.body.setPosition(this.body, { x, y: y + physicsOffsetY })
    }
    
    console.log(`Reset rock to (${x}, ${y}) with physics at (${x}, ${y + physicsOffsetY})`)
  }

  public deactivate(): void {
    this.isActive = false
    this.setVisible(false)
    this.setActive(false)
    
    // Move physics body off-screen to prevent collisions
    if (this.body) {
      this.scene.matter.body.setPosition(this.body, { x: -1000, y: -1000 })
    }
  }

  public destroy(fromScene?: boolean): void {
    // Clean up physics body
    if (this.body && this.scene.matter) {
      this.scene.matter.world.remove(this.body)
      this.body = null as any
    }
    
    super.destroy(fromScene)
  }
}