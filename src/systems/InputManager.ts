export class InputManager {
  private scene: Phaser.Scene
  private isInputActive: boolean = false
  private isTurboActive: boolean = false
  private keys: { [key: string]: Phaser.Input.Keyboard.Key } = {}
  
  public onInputStart: (() => void) | null = null
  public onInputEnd: (() => void) | null = null
  public onInputActive: ((isActive: boolean) => void) | null = null
  public onTurboActive: ((isActive: boolean) => void) | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.setupControls()
  }

  private setupControls(): void {
    // Desktop keyboard controls
    if (this.scene.input.keyboard) {
      this.keys.space = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
      this.keys.up = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
      this.keys.w = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
      this.keys.shift = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT) // Turbo boost
      this.keys.x = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X) // Alternative turbo
    }

    // Mobile touch controls - tap/hold anywhere on screen
    this.scene.input.on('pointerdown', this.handleInputStart, this)
    this.scene.input.on('pointerup', this.handleInputEnd, this)
    
    // Handle cases where pointer goes off screen
    this.scene.input.on('pointerout', this.handleInputEnd, this)
    this.scene.input.on('pointercancel', this.handleInputEnd, this)
  }

  private handleInputStart(): void {
    if (!this.isInputActive) {
      this.isInputActive = true
      
      if (this.onInputStart) {
        this.onInputStart()
      }
      
      if (this.onInputActive) {
        this.onInputActive(true)
      }
    }
  }

  private handleInputEnd(): void {
    if (this.isInputActive) {
      this.isInputActive = false
      
      if (this.onInputEnd) {
        this.onInputEnd()
      }
      
      if (this.onInputActive) {
        this.onInputActive(false)
      }
    }
  }

  public update(): void {
    // Check keyboard input
    let keyboardActive = false
    let turboActive = false
    
    if (this.keys.space) {
      keyboardActive = this.keys.space.isDown
    }
    if (this.keys.up && this.keys.up.isDown) {
      keyboardActive = true
    }
    if (this.keys.w && this.keys.w.isDown) {
      keyboardActive = true
    }
    
    // Check turbo boost keys
    if (this.keys.shift && this.keys.shift.isDown) {
      turboActive = true
    }
    if (this.keys.x && this.keys.x.isDown) {
      turboActive = true
    }

    // Update input state based on keyboard
    if (keyboardActive && !this.isInputActive) {
      this.handleInputStart()
    } else if (!keyboardActive && this.isInputActive && !this.scene.input.activePointer.isDown) {
      this.handleInputEnd()
    }
    
    // Update turbo state
    if (turboActive !== this.isTurboActive) {
      this.isTurboActive = turboActive
      if (this.onTurboActive) {
        this.onTurboActive(turboActive)
      }
    }
  }

  public isActive(): boolean {
    return this.isInputActive
  }
  
  public isTurbo(): boolean {
    return this.isTurboActive
  }

  public destroy(): void {
    // Clean up event listeners
    this.scene.input.off('pointerdown', this.handleInputStart, this)
    this.scene.input.off('pointerup', this.handleInputEnd, this)
    this.scene.input.off('pointerout', this.handleInputEnd, this)
    this.scene.input.off('pointercancel', this.handleInputEnd, this)
  }
}