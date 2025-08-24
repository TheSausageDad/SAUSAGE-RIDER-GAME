import GameSettings from "../config/GameSettings"
import { Poolable } from "../systems/ObjectPool"

export class Spike extends Phaser.GameObjects.Container implements Poolable {
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
    // Removed outline for cleaner appearance
    
    // Draw triangular spike shape
    this.spikeGraphics.beginPath()
    this.spikeGraphics.moveTo(0, height) // bottom center
    this.spikeGraphics.lineTo(-width/2, height) // bottom left
    this.spikeGraphics.lineTo(0, 0) // top point
    this.spikeGraphics.lineTo(width/2, height) // bottom right
    this.spikeGraphics.closePath()
    this.spikeGraphics.fillPath()
    // Removed strokePath() and detail lines for cleaner appearance
    
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

  public reset(x: number, y: number): void {
    this.x = x
    this.y = y
    this.setScale(1, 1)
    
    // Reset physics body position
    if (this.body && this.scene.matter && (this.scene.matter as any).Matter) {
      const Matter = (this.scene.matter as any).Matter
      Matter.Body.setPosition(this.body, { x, y })
    }
    
    // Stop any active tweens
    this.scene.tweens.killTweensOf(this)
  }

  public destroy(): void {
    // Properly cleanup Matter.js physics body
    if (this.body && this.scene.matter) {
      this.scene.matter.world.remove(this.body)
    }
    super.destroy()
  }
}