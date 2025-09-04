export class RockWarningSystem {
  private scene: Phaser.Scene
  private warningIndicator!: Phaser.GameObjects.Graphics
  private isActive: boolean = false
  private flashTween: Phaser.Tweens.Tween | null = null
  private upcomingRocks: { rock: any, distance: number }[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.createWarningIndicator()
  }

  private createWarningIndicator(): void {
    // Create red warning triangle at bottom of screen (Jetpack Joyride style)
    this.warningIndicator = this.scene.add.graphics()
    this.warningIndicator.setScrollFactor(0) // Stay relative to camera
    this.warningIndicator.setDepth(1000) // Above everything else
    this.warningIndicator.setVisible(false)

    // Draw red warning triangle
    this.warningIndicator.fillStyle(0xFF0000, 0.8) // Red with slight transparency
    this.warningIndicator.lineStyle(2, 0x990000, 1) // Darker red border

    // Triangle pointing down (warning ahead)
    this.warningIndicator.beginPath()
    this.warningIndicator.moveTo(0, -15) // Top point
    this.warningIndicator.lineTo(-15, 15) // Bottom left
    this.warningIndicator.lineTo(15, 15) // Bottom right
    this.warningIndicator.closePath()
    this.warningIndicator.fillPath()
    this.warningIndicator.strokePath()

    // Position at bottom center of screen
    this.warningIndicator.setPosition(200, 750) // Center X, near bottom Y

    console.log("Created rock warning indicator")
  }

  public update(playerX: number, playerVelocity: number, rocks: any[]): void {
    // Clear previous upcoming rocks
    this.upcomingRocks = []

    // Find rocks ahead of player within warning distance
    const playerSpeed = Math.abs(playerVelocity)
    const warningDistance = Math.max(playerSpeed * 2, 800) // 2 seconds ahead or minimum 800px

    for (const rock of rocks) {
      if (!rock.isActive) continue

      const distanceToRock = rock.x - playerX
      
      // Only warn about rocks ahead of player within warning distance
      if (distanceToRock > 0 && distanceToRock <= warningDistance) {
        this.upcomingRocks.push({ rock, distance: distanceToRock })
      }
    }

    // Show warning if there are upcoming rocks
    if (this.upcomingRocks.length > 0) {
      if (!this.isActive) {
        this.showWarning()
      }
      this.updateWarningIntensity()
    } else {
      if (this.isActive) {
        this.hideWarning()
      }
    }
  }

  private showWarning(): void {
    this.isActive = true
    this.warningIndicator.setVisible(true)

    // Create flashing tween
    this.flashTween = this.scene.tweens.add({
      targets: this.warningIndicator,
      alpha: { from: 1, to: 0.3 },
      duration: 300,
      ease: 'Power2',
      yoyo: true,
      repeat: -1 // Infinite repeat
    })

    console.log("Rock warning activated")
  }

  private hideWarning(): void {
    this.isActive = false
    this.warningIndicator.setVisible(false)

    // Stop flashing tween
    if (this.flashTween) {
      this.flashTween.destroy()
      this.flashTween = null
    }

    console.log("Rock warning deactivated")
  }

  private updateWarningIntensity(): void {
    if (!this.isActive || this.upcomingRocks.length === 0) return

    // Find closest rock
    const closestRock = this.upcomingRocks.reduce((closest, current) => 
      current.distance < closest.distance ? current : closest
    )

    // Adjust warning intensity based on distance to closest rock
    const normalizedDistance = closestRock.distance / 800 // 0-1 scale
    const intensity = 1 - normalizedDistance // Closer = more intense

    // Update flash speed based on intensity
    if (this.flashTween) {
      this.flashTween.timeScale = 0.5 + intensity * 1.5 // 0.5x to 2x speed
    }

    // Update warning color based on intensity
    const red = Math.floor(255 * (0.6 + intensity * 0.4)) // More intense red when closer
    this.warningIndicator.clear()
    this.warningIndicator.fillStyle((red << 16) | 0x0000, 0.8)
    this.warningIndicator.lineStyle(2, 0x990000, 1)

    // Redraw triangle
    this.warningIndicator.beginPath()
    this.warningIndicator.moveTo(0, -15)
    this.warningIndicator.lineTo(-15, 15)
    this.warningIndicator.lineTo(15, 15)
    this.warningIndicator.closePath()
    this.warningIndicator.fillPath()
    this.warningIndicator.strokePath()
  }

  public destroy(): void {
    if (this.flashTween) {
      this.flashTween.destroy()
      this.flashTween = null
    }
    
    if (this.warningIndicator) {
      this.warningIndicator.destroy()
    }
  }
}