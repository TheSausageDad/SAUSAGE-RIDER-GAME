import GameSettings from "../config/GameSettings"

export class Token extends Phaser.GameObjects.Container {
  public body!: MatterJS.Body
  private tokenSprite!: Phaser.GameObjects.Arc
  private rotationSpeed: number = 180 // degrees per second
  public isCollected: boolean = false

  public onCollect: ((token: Token) => void) | null = null

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)
    
    this.createSprite()
    
    scene.add.existing(this)
    this.setupPhysics()
  }

  private createSprite(): void {
    // Create a coin-like circular token
    this.tokenSprite = this.scene.add.circle(0, 0, GameSettings.tokens.size, 0xFFD700) // Gold color
    this.tokenSprite.setStrokeStyle(3, 0xFFA500) // Orange outline
    
    // Add inner circle for detail
    const innerCircle = this.scene.add.circle(0, 0, GameSettings.tokens.size * 0.6, 0xFFFF00) // Bright yellow
    
    this.add([this.tokenSprite, innerCircle])
  }

  private setupPhysics(): void {
    // Create Matter physics body
    this.body = this.scene.matter.add.circle(
      this.x, this.y, GameSettings.tokens.size,
      {
        isStatic: true,
        isSensor: true, // Allow overlap without collision
        label: 'token'
      }
    )
    
    // Link to game object
    this.scene.matter.add.gameObject(this, this.body)
  }

  public update(deltaTime: number): void {
    if (this.isCollected) return

    // Rotate the token for visual appeal
    const dt = deltaTime / 1000
    this.rotation += Phaser.Math.DegToRad(this.rotationSpeed * dt)

    // Add floating animation
    const time = this.scene.time.now * 0.002
    const floatOffset = Math.sin(time + this.x * 0.01) * 10
    this.y += floatOffset * dt
  }

  public collect(): void {
    if (this.isCollected) return
    
    this.isCollected = true
    
    // Play collection effect
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        if (this.onCollect) {
          this.onCollect(this)
        }
        this.destroy()
      }
    })
  }

  public getValue(): number {
    return GameSettings.tokens.value
  }

  public destroy(): void {
    super.destroy()
  }
}