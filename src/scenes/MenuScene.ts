import GameSettings from "../config/GameSettings"

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  preload(): void {
    // Load the start page image and buttons
    this.load.image('startPage', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/Start%20Page-7J4wj6UCmtxn4YuDyuO7lyCCxJIGc5.png?UdiC')
    this.load.image('startButton', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/Start%20Button-6OK3ndhEFEK0KBNEUqpMIXqP7EuCtm.png?8rXX')
    this.load.image('howToPlayButton', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/How%20to%20Play%20Button-e1HBcpL8VrQzihBPsXnBr2SYNZHy8l.png?PB9T')
  }

  create(): void {
    // Add the start page image, centered and scaled to fit the screen
    const startImage = this.add.image(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      'startPage'
    )
    
    // Scale the image to fit the screen while maintaining aspect ratio
    const scaleX = GameSettings.canvas.width / startImage.width
    const scaleY = GameSettings.canvas.height / startImage.height
    const scale = Math.max(scaleX, scaleY) // Use max to fill the screen
    
    startImage.setScale(scale)

    // Add the start button image
    const startButton = this.add.image(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height - 180,
      'startButton'
    )
    startButton.setOrigin(0.5)
    
    // Set start button width
    const startButtonWidth = 225 // Start button width
    const startButtonScale = startButtonWidth / startButton.width
    startButton.setScale(startButtonScale)
    
    // Make the start button interactive
    startButton.setInteractive({ useHandCursor: true })
    
    // Add hover/click effects
    startButton.on('pointerover', () => {
      startButton.setTint(0xdddddd) // Slightly darker on hover
    })
    
    startButton.on('pointerout', () => {
      startButton.clearTint() // Return to normal
    })
    
    startButton.on('pointerdown', () => {
      startButton.setTint(0xaaaaaa) // Even darker when clicked
    })
    
    startButton.on('pointerup', () => {
      startButton.clearTint()
      this.scene.start('GameScene')
    })

    // Add the how to play button
    const howToPlayButton = this.add.image(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height - 60,
      'howToPlayButton'
    )
    howToPlayButton.setOrigin(0.5)
    
    // Set how to play button to be longer
    const howToPlayWidth = 225 // How to play button width (same as start)
    const howToPlayScale = howToPlayWidth / howToPlayButton.width
    howToPlayButton.setScale(howToPlayScale) // Make it longer than start button
    
    // Make the how to play button interactive
    howToPlayButton.setInteractive({ useHandCursor: true })
    
    // Add hover/click effects for how to play button
    howToPlayButton.on('pointerover', () => {
      howToPlayButton.setTint(0xdddddd)
    })
    
    howToPlayButton.on('pointerout', () => {
      howToPlayButton.clearTint()
    })
    
    howToPlayButton.on('pointerdown', () => {
      howToPlayButton.setTint(0xaaaaaa)
    })
    
    howToPlayButton.on('pointerup', () => {
      howToPlayButton.clearTint()
      this.scene.start('HowToPlayScene')
    })

    // Also allow keyboard input (spacebar or enter) to start
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene')
    })

    this.input.keyboard?.on('keydown-ENTER', () => {
      this.scene.start('GameScene')
    })

  }
}