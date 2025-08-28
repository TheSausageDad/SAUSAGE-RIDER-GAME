import GameSettings from "../config/GameSettings"

export class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HowToPlayScene' })
  }

  preload(): void {
    // Load the back button image
    this.load.image('backButton', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/BAck%20button-7SM2eT8LpGI03B66SXHJS5jDgoZby2.png?5oGJ')
    
    // Load the game's custom font
    this.load.font('pressStart2P', 'assets/fonts/Press_Start_2P/PressStart2P-Regular.ttf')
    
    // Load background image to match game
    this.load.image('background', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/Snow%20Background-KfEe8V5zyq6R8WytKn6B5VKt6f67Ui.png?G00d')
  }

  create(): void {
    // Add the same background as the game
    const backgroundImage = this.add.image(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      'background'
    )
    
    // Scale the background to fit the screen
    const scaleX = GameSettings.canvas.width / backgroundImage.width
    const scaleY = GameSettings.canvas.height / backgroundImage.height
    const scale = Math.max(scaleX, scaleY)
    backgroundImage.setScale(scale)

    // Add semi-transparent overlay for readability
    const overlay = this.add.rectangle(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      GameSettings.canvas.width,
      GameSettings.canvas.height,
      0x000000,
      0.6
    )

    // Title using game font with stroke
    const title = this.add.text(GameSettings.canvas.width / 2, 100, 'HOW TO PLAY', {
      fontSize: '28px',
      color: '#FFFFFF',
      fontFamily: 'pressStart2P',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5)

    // Create styled control box
    const boxWidth = 320
    const boxHeight = 280
    const boxX = GameSettings.canvas.width / 2
    const boxY = GameSettings.canvas.height / 2

    // Main box background with rounded corners effect
    const boxBg = this.add.rectangle(boxX, boxY, boxWidth, boxHeight, 0x1a1a1a, 0.9)
    
    // Border effect - outer glow
    const outerBorder = this.add.rectangle(boxX, boxY, boxWidth + 8, boxHeight + 8, 0x4169E1, 0.3)
    
    // Inner border - bright accent
    const innerBorder = this.add.rectangle(boxX, boxY, boxWidth + 4, boxHeight + 4, 0x87CEEB, 0.6)
    
    // Title section background
    const titleBg = this.add.rectangle(boxX, boxY - boxHeight/2 + 30, boxWidth - 8, 50, 0x4169E1, 0.8)

    // CONTROLS title
    this.add.text(boxX, boxY - boxHeight/2 + 30, 'CONTROLS', {
      fontSize: '24px',
      color: '#FFFFFF',
      fontFamily: 'pressStart2P',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5)

    // Show both desktop and mobile controls
    const controlY = boxY - 60

    // Desktop controls section (top)
    this.add.text(boxX, controlY, 'DESKTOP', {
      fontSize: '16px',
      color: '#FFD700',
      fontFamily: 'pressStart2P',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5)

    this.add.text(boxX, controlY + 30, 'Press space to jump', {
      fontSize: '12px',
      color: '#FFFFFF',
      fontFamily: 'pressStart2P',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5)
    
    this.add.text(boxX, controlY + 50, 'Press and hold to flip', {
      fontSize: '12px',
      color: '#FFFFFF',
      fontFamily: 'pressStart2P',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5)

    // Separator line
    const separatorY = controlY + 80
    this.add.rectangle(boxX, separatorY, boxWidth - 40, 2, 0x87CEEB, 0.8)

    // Mobile controls section (bottom)
    this.add.text(boxX, separatorY + 25, 'MOBILE', {
      fontSize: '16px',
      color: '#FFD700',
      fontFamily: 'pressStart2P',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5)

    this.add.text(boxX, separatorY + 55, 'Tap to jump', {
      fontSize: '12px',
      color: '#FFFFFF',
      fontFamily: 'pressStart2P',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5)
    
    this.add.text(boxX, separatorY + 75, 'Tap and hold to flip', {
      fontSize: '12px',
      color: '#FFFFFF',
      fontFamily: 'pressStart2P',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5)

    // Back button at bottom center
    const backButton = this.add.image(GameSettings.canvas.width / 2, GameSettings.canvas.height - 80, 'backButton')
    backButton.setOrigin(0.5)
    backButton.setScale(0.22) // A bit bigger
    
    // Make back button interactive
    backButton.setInteractive({ useHandCursor: true })
    
    backButton.on('pointerover', () => {
      backButton.setTint(0xdddddd)
    })
    
    backButton.on('pointerout', () => {
      backButton.clearTint()
    })
    
    backButton.on('pointerdown', () => {
      backButton.setTint(0xaaaaaa)
    })
    
    backButton.on('pointerup', () => {
      backButton.clearTint()
      this.scene.start('MenuScene')
    })

    // Allow ESC key to go back
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MenuScene')
    })
  }
}