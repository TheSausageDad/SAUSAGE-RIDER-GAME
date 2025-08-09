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
  
  public onSpeedChange: ((newSpeed: number) => void) | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.gameStartTime = scene.time.now
    this.createUI()
  }

  private createUI(): void {
    // Score display in top-left
    this.scoreText = this.scene.add.text(20, 20, this.getScoreDisplayText(), {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3
    })
    this.scoreText.setDepth(1000)

    // Flip counter in top-right
    this.flipText = this.scene.add.text(GameSettings.canvas.width - 20, 20, `Flips: ${this.flips}`, {
      fontSize: '24px',
      color: '#FFD700',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3
    })
    this.flipText.setOrigin(1, 0)
    this.flipText.setDepth(1000)
    
    // Controls hint at bottom
    this.controlsText = this.scene.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height - 60,
      'HOLD SPACE/TAP: Accelerate | SHIFT/X: Turbo Boost',
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
    
    // Turbo indicator (hidden by default)
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
    this.turboText.setVisible(false)
  }

  private getScoreDisplayText(): string {
    return `Score: ${this.score}\nTokens: ${this.tokens}`
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

  private showScorePopup(points: number, color: number, text: string): void {
    const popup = this.scene.add.text(
      GameSettings.canvas.width / 2, 
      GameSettings.canvas.height / 2 - 100, 
      text,
      {
        fontSize: '36px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 4
      }
    )
    popup.setOrigin(0.5)
    popup.setDepth(1001)

    // Animate popup
    this.scene.tweens.add({
      targets: popup,
      y: popup.y - 80,
      alpha: 0,
      scale: 1.5,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
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
    this.flipText.setText(`Flips: ${this.flips}`)
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
    this.updateUI()
  }

  public showGameOver(): void {
    // Game over screen
    const overlay = this.scene.add.rectangle(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      GameSettings.canvas.width,
      GameSettings.canvas.height,
      0x000000,
      0.7
    )
    overlay.setDepth(999)

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

    const finalScoreText = this.scene.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 + 20,
      `Final Score: ${this.score}\nFlips: ${this.flips}\nTokens: ${this.tokens}`,
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

    // Blinking restart text
    this.scene.tweens.add({
      targets: restartText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    })
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
  }
}