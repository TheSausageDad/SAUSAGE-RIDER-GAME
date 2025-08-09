import GameSettings from "../config/GameSettings"

export class Spike extends Phaser.GameObjects.Container {
  public body!: MatterJS.Body
  private spikeGraphics!: Phaser.GameObjects.Graphics

  public onHit: ((spike: Spike) => void) | null = null

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)
    
    this.createSprite()
    
    scene.add.existing(this)
    this.setupPhysics()
  }

  private createSprite(): void {
    const width = GameSettings.obstacles.spikeWidth
    const height = GameSettings.obstacles.spikeHeight
    
    this.spikeGraphics = this.scene.add.graphics()
    this.spikeGraphics.fillStyle(0xFF4444) // Red color for danger
    this.spikeGraphics.lineStyle(2, 0xAA2222) // Darker red outline
    
    // Draw triangular spike shape
    this.spikeGraphics.beginPath()
    this.spikeGraphics.moveTo(0, height) // bottom center
    this.spikeGraphics.lineTo(-width/2, height) // bottom left
    this.spikeGraphics.lineTo(0, 0) // top point
    this.spikeGraphics.lineTo(width/2, height) // bottom right
    this.spikeGraphics.closePath()
    this.spikeGraphics.fillPath()
    this.spikeGraphics.strokePath()
    
    // Add some detail lines
    this.spikeGraphics.lineStyle(1, 0x662222)
    this.spikeGraphics.lineBetween(-width/4, height * 0.7, 0, height * 0.3)
    this.spikeGraphics.lineBetween(width/4, height * 0.7, 0, height * 0.3)
    
    this.add(this.spikeGraphics)
  }

  private setupPhysics(): void {
    // Create triangular spike shape with vertices
    const width = GameSettings.obstacles.spikeWidth * 0.8
    const height = GameSettings.obstacles.spikeHeight * 0.9
    
    const vertices = [
      { x: 0, y: -height/2 }, // top point
      { x: -width/2, y: height/2 }, // bottom left
      { x: width/2, y: height/2 }  // bottom right
    ]
    
    this.body = this.scene.matter.add.fromVertices(
      this.x, this.y, vertices,
      {
        isStatic: true,
        isSensor: true, // Allow overlap for damage detection
        label: 'spike'
      }
    )
    
    // Link to game object
    this.scene.matter.add.gameObject(this, this.body)
  }

  public update(deltaTime: number): void {
    // Spikes are static, but we could add some visual effects here
    // For example, a subtle pulse or glow effect to make them more noticeable
  }

  public triggerHit(): void {
    if (this.onHit) {
      this.onHit(this)
    }
    
    // Visual feedback when hit
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.setScale(1, 1)
      }
    })
  }

  public destroy(): void {
    super.destroy()
  }
}