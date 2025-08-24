import GameSettings from "../config/GameSettings"

export class ScoreManager {
  private scene: Phaser.Scene
  private score: number = 0
  private flips: number = 0
  private tokens: number = 0
  private gameStartTime: number = 0
  private currentSpeed: number = GameSettings.level.scrollSpeed
  
  private scoreText!: Phaser.GameObjects.Text
  private flipText!: Phaser.GameObjects.Text
  private controlsText!: Phaser.GameObjects.Text
  private turboText!: Phaser.GameObjects.Text
  private grindText!: Phaser.GameObjects.Text
  
  // Game over screen elements
  private gameOverElements: Phaser.GameObjects.GameObject[] = []
  
  // Active popup elements (score popups, trick displays)
  private activePopups: Phaser.GameObjects.GameObject[] = []
  
  public onSpeedChange: ((newSpeed: number) => void) | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.gameStartTime = scene.time.now
    this.createUI()
  }

  private createUI(): void {
    // Score display in top-left - fixed to camera
    this.scoreText = this.scene.add.text(20, 20, this.getScoreDisplayText(), {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3
    })
    this.scoreText.setDepth(1000)
    this.scoreText.setScrollFactor(0) // Fixed to camera

    // Spin counter in top-right - fixed to camera
    this.flipText = this.scene.add.text(GameSettings.canvas.width - 20, 20, `Spins: ${this.flips}`, {
      fontSize: '24px',
      color: '#FFD700',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3
    })
    this.flipText.setOrigin(1, 0)
    this.flipText.setDepth(1000)
    this.flipText.setScrollFactor(0) // Fixed to camera
    
    // Controls hint at bottom - fixed to camera
    this.controlsText = this.scene.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height - 60,
      'HOLD SPACE/TAP: Jump & Spin | Release to auto-correct',
      {
        fontSize: '20px',
        color: '#aaaaaa',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 2,
        align: 'center'
      }
    )
    this.controlsText.setOrigin(0.5)
    this.controlsText.setDepth(1000)
    this.controlsText.setScrollFactor(0) // Fixed to camera
    
    // Turbo indicator (hidden by default) - fixed to camera
    this.turboText = this.scene.add.text(
      GameSettings.canvas.width / 2,
      100,
      'TURBO ACTIVE!',
      {
        fontSize: '42px',
        color: '#FF0000',
        fontFamily: 'Arial',
        stroke: '#FFFF00',
        strokeThickness: 4
      }
    )
    this.turboText.setOrigin(0.5)
    this.turboText.setDepth(1000)
    this.turboText.setScrollFactor(0) // Fixed to camera
    this.turboText.setVisible(false)
    
    // Persistent grind score display (hidden by default) - fixed to camera
    this.grindText = this.scene.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 - 50,
      'RAIL GRIND!\n+0',
      {
        fontSize: '28px',
        color: '#FFD700',
        fontFamily: 'Arial',
        stroke: '#8B4513', // Brown stroke for rail theme
        strokeThickness: 4,
        align: 'center'
      }
    )
    this.grindText.setOrigin(0.5)
    this.grindText.setDepth(1001)
    this.grindText.setScrollFactor(0) // Fixed to camera
    this.grindText.setVisible(false)
  }

  private getScoreDisplayText(): string {
    return `Score: ${this.score}\nCoins: ${this.tokens}`
  }

  public addFlip(): void {
    this.flips++
    const flipScore = GameSettings.scoring.flipPoints
    this.score += flipScore
    
    this.updateUI()
    
    // Visual feedback for flip
    this.showScorePopup(flipScore, 0xFFD700, `+${flipScore}`)
  }

  public addToken(): void {
    this.tokens++
    const tokenScore = GameSettings.scoring.tokenPoints
    this.score += tokenScore
    
    this.updateUI()
    
    // Visual feedback for token collection
    this.showScorePopup(tokenScore, 0x00FF00, `+${tokenScore}`)
  }

  public addTrickScore(totalScore: number, tricks: string[], multiplier: number): void {
    this.score += totalScore
    this.updateUI()
    
    // Create impressive trick display
    let trickText = tricks.join(" + ")
    if (multiplier > 1) {
      trickText += ` x${multiplier}`
    }
    
    // Show bigger popup for bigger scores - fixed to camera
    const fontSize = Math.min(24 + (totalScore / 200), 36)
    const popup = this.scene.add.text(
      GameSettings.canvas.width / 2, 
      GameSettings.canvas.height / 2 - 50, 
      `${trickText}\n+${totalScore}`,
      {
        fontSize: `${fontSize}px`,
        color: '#FFD700',
        fontFamily: 'Arial',
        stroke: '#FF4500',
        strokeThickness: 4,
        align: 'center'
      }
    )
    popup.setOrigin(0.5)
    popup.setDepth(1001)
    popup.setScrollFactor(0) // Fixed to camera
    
    // Track this popup for cleanup
    this.activePopups.push(popup)

    // Epic animation for tricks
    this.scene.tweens.add({
      targets: popup,
      y: popup.y - 120,
      alpha: 0,
      scale: 1.8,
      duration: 2000,
      ease: 'Power3.easeOut',
      onComplete: () => {
        // Remove from tracking array when destroyed
        const index = this.activePopups.indexOf(popup)
        if (index > -1) {
          this.activePopups.splice(index, 1)
        }
        popup.destroy()
      }
    })
    
    // Screen shake for big scores
    if (totalScore > 1000) {
      this.scene.cameras.main.shake(200, 0.02)
    }
  }

  public startGrindDisplay(): void {
    this.grindText.setVisible(true)
    this.grindText.setText('RAIL GRIND!\n+0')
    this.grindText.setAlpha(1.0)
    
    // Add pulsing effect
    this.scene.tweens.add({
      targets: this.grindText,
      scale: 1.1,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }
  
  public updateGrindDisplay(currentScore: number, grindTime: number): void {
    if (this.grindText.visible) {
      this.grindText.setText(`RAIL GRIND!\n${grindTime.toFixed(1)}s\n+${currentScore}`)
    }
  }
  
  public endGrindDisplay(finalScore: number, grindTime: number): void {
    // Stop pulsing animation
    this.scene.tweens.killTweensOf(this.grindText)
    this.grindText.setScale(1.0)
    
    // Final score display with fade out
    this.grindText.setText(`RAIL GRIND COMPLETE!\n${grindTime.toFixed(1)}s\n+${finalScore}`)
    
    this.scene.tweens.add({
      targets: this.grindText,
      y: this.grindText.y - 80,
      alpha: 0,
      scale: 1.4,
      duration: 2000,
      ease: 'Power2.easeOut',
      onComplete: () => {
        this.grindText.setVisible(false)
        this.grindText.y = GameSettings.canvas.height / 2 - 50 // Reset position
        this.grindText.setScale(1.0)
      }
    })
    
    // Add the score to the total
    this.score += finalScore
    this.updateUI()
  }

  public addGrindScore(grindScore: number, grindTime: number): void {
    this.score += grindScore
    this.updateUI()
    
    // Create grind bonus display
    const grindText = `RAIL GRIND!\n${grindTime.toFixed(1)}s`
    
    // Show grind popup - fixed to camera
    const popup = this.scene.add.text(
      GameSettings.canvas.width / 2, 
      GameSettings.canvas.height / 2 - 100, 
      `${grindText}\n+${grindScore}`,
      {
        fontSize: '24px',
        color: '#FFD700',
        fontFamily: 'Arial',
        stroke: '#8B4513', // Brown stroke for rail theme
        strokeThickness: 4,
        align: 'center'
      }
    )
    popup.setOrigin(0.5)
    popup.setDepth(1001)
    popup.setScrollFactor(0) // Fixed to camera
    
    // Track this popup for cleanup
    this.activePopups.push(popup)

    // Animation for grind bonus
    this.scene.tweens.add({
      targets: popup,
      y: popup.y - 80,
      alpha: 0,
      scale: 1.4,
      duration: 1500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        // Remove from tracking array when destroyed
        const index = this.activePopups.indexOf(popup)
        if (index > -1) {
          this.activePopups.splice(index, 1)
        }
        popup.destroy()
      }
    })
    
    // Mild screen shake for grind completion
    if (grindTime > 1.0) {
      this.scene.cameras.main.shake(150, 0.01)
    }
  }

  private showScorePopup(points: number, color: number, text: string): void {
    const popup = this.scene.add.text(
      GameSettings.canvas.width / 2, 
      GameSettings.canvas.height / 2 - 100, 
      text,
      {
        fontSize: '24px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 4
      }
    )
    popup.setOrigin(0.5)
    popup.setDepth(1001)
    popup.setScrollFactor(0) // Fixed to camera
    
    // Track this popup for cleanup
    this.activePopups.push(popup)

    // Animate popup
    this.scene.tweens.add({
      targets: popup,
      y: popup.y - 80,
      alpha: 0,
      scale: 1.5,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        // Remove from tracking array when destroyed
        const index = this.activePopups.indexOf(popup)
        if (index > -1) {
          this.activePopups.splice(index, 1)
        }
        popup.destroy()
      }
    })
  }

  public update(): void {
    this.updateSpeed()
  }

  private updateSpeed(): void {
    // Increase speed over time
    const elapsedTime = (this.scene.time.now - this.gameStartTime) / 1000
    const speedIncrements = Math.floor(elapsedTime / 10) // Every 10 seconds
    const newSpeed = Math.min(
      GameSettings.level.scrollSpeed + (speedIncrements * GameSettings.level.speedIncrement),
      GameSettings.level.maxSpeed
    )

    if (newSpeed !== this.currentSpeed) {
      this.currentSpeed = newSpeed
      if (this.onSpeedChange) {
        this.onSpeedChange(this.currentSpeed)
      }
    }
  }

  private updateUI(): void {
    this.scoreText.setText(this.getScoreDisplayText())
    this.flipText.setText(`Spins: ${this.flips}`)
  }

  public getCurrentSpeed(): number {
    return this.currentSpeed
  }

  public getScore(): number {
    return this.score
  }

  public getFlips(): number {
    return this.flips
  }

  public getTokens(): number {
    return this.tokens
  }

  public reset(): void {
    this.score = 0
    this.flips = 0
    this.tokens = 0
    this.gameStartTime = this.scene.time.now
    this.currentSpeed = GameSettings.level.scrollSpeed
    
    // Clean up game over screen
    this.hideGameOver()
    
    // Clean up all floating popups (yellow score text, etc.)
    this.clearAllPopups()
    
    // Hide and reset grind display
    if (this.grindText) {
      this.scene.tweens.killTweensOf(this.grindText)
      this.grindText.setVisible(false)
      this.grindText.setScale(1.0)
      this.grindText.y = GameSettings.canvas.height / 2 - 50
    }
    
    this.updateUI()
  }

  public showGameOver(): void {
    // Clear any existing game over elements first
    this.hideGameOver()
    
    // Game over screen - fixed to camera
    const overlay = this.scene.add.rectangle(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      GameSettings.canvas.width,
      GameSettings.canvas.height,
      0x000000,
      0.7
    )
    overlay.setDepth(999)
    overlay.setScrollFactor(0) // Fixed to camera
    this.gameOverElements.push(overlay)

    const gameOverText = this.scene.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 - 100,
      'GAME OVER',
      {
        fontSize: '72px',
        color: '#ff4444',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 4
      }
    )
    gameOverText.setOrigin(0.5)
    gameOverText.setDepth(1000)
    gameOverText.setScrollFactor(0) // Fixed to camera
    this.gameOverElements.push(gameOverText)

    const finalScoreText = this.scene.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 + 20,
      `Final Score: ${this.score}\nSpins: ${this.flips}\nCoins: ${this.tokens}`,
      {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center'
      }
    )
    finalScoreText.setOrigin(0.5)
    finalScoreText.setDepth(1000)
    finalScoreText.setScrollFactor(0) // Fixed to camera
    this.gameOverElements.push(finalScoreText)

    const restartText = this.scene.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 + 150,
      'Tap to restart',
      {
        fontSize: '28px',
        color: '#cccccc',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 2
      }
    )
    restartText.setOrigin(0.5)
    restartText.setDepth(1000)
    restartText.setScrollFactor(0) // Fixed to camera
    this.gameOverElements.push(restartText)

    // Blinking restart text
    this.scene.tweens.add({
      targets: restartText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    })
  }

  public hideGameOver(): void {
    // Clean up all game over screen elements
    this.gameOverElements.forEach(element => {
      if (element && element.active) {
        element.destroy()
      }
    })
    this.gameOverElements = []
    
    // Kill all tweens that might be running
    this.scene.tweens.killAll()
  }

  public clearAllPopups(): void {
    // Clean up all active popup elements (yellow score text, etc.)
    this.activePopups.forEach(popup => {
      if (popup && popup.active) {
        popup.destroy()
      }
    })
    this.activePopups = []
    
    // Kill all tweens to prevent animations from continuing
    this.scene.tweens.killAll()
  }

  public showTurbo(active: boolean): void {
    this.turboText.setVisible(active)
    if (active) {
      // Pulsing effect for turbo text
      this.scene.tweens.add({
        targets: this.turboText,
        scale: 1.2,
        duration: 200,
        yoyo: true,
        repeat: -1
      })
    } else {
      this.scene.tweens.killTweensOf(this.turboText)
      this.turboText.setScale(1)
    }
  }
  
  public destroy(): void {
    // Clean up game over screen first
    this.hideGameOver()
    
    // Clean up all active popups
    this.clearAllPopups()
    
    if (this.scoreText) {
      this.scoreText.destroy()
    }
    if (this.flipText) {
      this.flipText.destroy()
    }
    if (this.controlsText) {
      this.controlsText.destroy()
    }
    if (this.turboText) {
      this.turboText.destroy()
    }
    if (this.grindText) {
      this.grindText.destroy()
    }
  }
}