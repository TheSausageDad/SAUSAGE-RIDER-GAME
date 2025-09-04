export class FlipTimer {
  private scene: Phaser.Scene
  private timerBar!: Phaser.GameObjects.Image
  private timerRim!: Phaser.GameObjects.Image
  private currentTime: number = 0
  private maxTime: number = 17 // 17 seconds total
  private isActive: boolean = true
  private lastUpdateTime: number = 0

  public onTimerExpired: (() => void) | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.lastUpdateTime = scene.time.now
    this.createTimerUI()
  }

  private createTimerUI(): void {
    // Position settings
    const barWidth = 300
    const barHeight = 50 // Taller to accommodate custom image
    const barX = (400 - barWidth) / 2 // Center horizontally (400px screen width)
    const barY = 700 // Higher up to accommodate taller image

    // Create timer rim image first (background/frame)
    this.timerRim = this.scene.add.image(barX + barWidth/2, barY + barHeight/2, 'timer_rim')
    this.timerRim.setScrollFactor(0)
    this.timerRim.setDepth(999) // Behind the progress bar
    this.timerRim.setOrigin(0.5, 0.5) // Center the image
    
    // Scale rim bigger than the timer area to create proper frame
    const rimScale = Math.min(barWidth / this.timerRim.width, barHeight / this.timerRim.height) * 2.5
    this.timerRim.setScale(rimScale)

    // Create your custom timer bar image
    this.timerBar = this.scene.add.image(barX + barWidth/2 + 15, barY + barHeight/2, 'timer_bar')
    this.timerBar.setScrollFactor(0)
    this.timerBar.setDepth(1000)
    this.timerBar.setOrigin(0.5, 0.5) // Center the image
    
    // Scale the image to fit inside the rim when complete
    const imageScale = Math.min(barWidth / this.timerBar.width, barHeight / this.timerBar.height) * 0.92
    this.timerBar.setScale(imageScale)

    console.log("Custom FlipTimer UI created with rim background and wiener progress bar")
  }

  private updateTimerVisual(): void {
    const barWidth = 300
    const barHeight = 50
    const barX = (400 - barWidth) / 2 // Center horizontally (400px screen width)
    const barY = 700

    // Calculate progress (0 to 1)
    const progress = Math.min(this.currentTime / this.maxTime, 1)

    // Scale the image horizontally to show progress (from left to right)
    const imageScale = Math.min(barWidth / this.timerBar.width, barHeight / this.timerBar.height) * 0.92
    this.timerBar.setScale(imageScale * progress, imageScale) // Scale width by progress, keep height
    
    // Adjust position so it grows from left edge
    const fullWidth = this.timerBar.width * imageScale
    const currentWidth = fullWidth * progress
    this.timerBar.setPosition(
      barX + (currentWidth / 2) + 15, // Position so left edge stays at barX, pushed right
      barY + barHeight/2
    )

    // Add visual effects based on time remaining
    if (this.currentTime < 10) {
      // 0-10 seconds: Normal appearance
      this.timerBar.setTint(0xFFFFFF) // No tint
      this.timerBar.setAlpha(1.0)
    } else if (this.currentTime < 13) {
      // 10-13 seconds: Orange tint for warning
      this.timerBar.setTint(0xFFA500) // Orange tint
      this.timerBar.setAlpha(1.0)
    } else {
      // 13-15 seconds: Red flashing for critical
      const flashSpeed = 8 // Flashes per second
      const flashValue = Math.sin(this.scene.time.now * flashSpeed / 1000) * 0.3 + 0.7 // 0.4 to 1.0
      this.timerBar.setTint(0xFF0000) // Red tint
      this.timerBar.setAlpha(flashValue)
    }
  }

  public update(): void {
    if (!this.isActive) return

    const currentTime = this.scene.time.now
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000 // Convert to seconds
    this.lastUpdateTime = currentTime

    // Increment timer
    this.currentTime += deltaTime

    // Check if timer expired
    if (this.currentTime >= this.maxTime) {
      this.currentTime = this.maxTime
      this.isActive = false
      console.log("⏰ FLIP TIMER EXPIRED! Time to die!")
      
      if (this.onTimerExpired) {
        this.onTimerExpired()
      }
    }

    // Update visual
    this.updateTimerVisual()
  }

  public resetTimer(): void {
    this.currentTime = 0
    this.isActive = true
    this.lastUpdateTime = this.scene.time.now
    console.log("🔄 Flip timer RESET! Player performed flip action")
  }

  public pauseTimer(): void {
    this.isActive = false
  }

  public resumeTimer(): void {
    this.isActive = true
    this.lastUpdateTime = this.scene.time.now
  }

  public getCurrentTime(): number {
    return this.currentTime
  }

  public getTimeRemaining(): number {
    return Math.max(0, this.maxTime - this.currentTime)
  }

  public destroy(): void {
    if (this.timerBar) {
      this.timerBar.destroy()
    }
    if (this.timerRim) {
      this.timerRim.destroy()
    }
  }
}