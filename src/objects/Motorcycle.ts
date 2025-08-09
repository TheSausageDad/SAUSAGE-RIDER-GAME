import GameSettings from "../config/GameSettings"

export class Motorcycle extends Phaser.GameObjects.Container {
  public body!: any // Matter body
  private frontWheel!: Phaser.GameObjects.Arc
  private backWheel!: Phaser.GameObjects.Arc
  public frontWheelBody!: any // Matter body
  public backWheelBody!: any // Matter body
  public chassisBody!: any // Matter body
  private frontConstraint!: any // Matter constraint
  private backConstraint!: any // Matter constraint
  private bikeSprite!: Phaser.GameObjects.Rectangle
  private riderSprite!: Phaser.GameObjects.Rectangle
  
  private isOnGround: boolean = false
  private isFlipping: boolean = false
  private flipDirection: number = 0 // 1 for clockwise, -1 for counter-clockwise
  private currentRotation: number = 0
  private completedFlips: number = 0
  private wasInAir: boolean = false
  private currentSlope: number = 0 // Track current slope angle
  private stuckTimer: number = 0 // Track if stuck on hill
  private turboActive: boolean = false // Turbo boost state
  private turboMultiplier: number = 1.0 // Current turbo multiplier
  
  public onFlipComplete: ((flips: number) => void) | null = null
  public onDeath: (() => void) | null = null

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)
    
    this.createSprites()
    
    scene.add.existing(this)
    // Don't use arcade physics - we'll use Matter physics instead
    
    this.setupPhysics()
  }

  private createSprites(): void {
    // Motorcycle body (main rectangle)
    this.bikeSprite = this.scene.add.rectangle(0, 0, GameSettings.motorcycle.width, GameSettings.motorcycle.height, 0x333333)
    this.bikeSprite.setStrokeStyle(2, 0xffffff)
    this.add(this.bikeSprite)

    // Rider (smaller rectangle on top)
    this.riderSprite = this.scene.add.rectangle(0, -20, 20, 30, 0x666666)
    this.riderSprite.setStrokeStyle(1, 0xffffff)
    this.add(this.riderSprite)

    // Create wheels as separate game objects for Matter physics
    this.frontWheel = this.scene.add.circle(this.x - 20, this.y + 15, 8, 0x222222)
    this.frontWheel.setStrokeStyle(1, 0xffffff)
    
    this.backWheel = this.scene.add.circle(this.x + 20, this.y + 15, 8, 0x222222)
    this.backWheel.setStrokeStyle(1, 0xffffff)
  }

  private setupPhysics(): void {
    // Access Matter.js through Phaser's global
    const MatterLib = Phaser.Physics.Matter.Matter
    
    // Create chassis (main body)
    this.chassisBody = this.scene.matter.add.rectangle(
      this.x, this.y, 
      GameSettings.motorcycle.width, GameSettings.motorcycle.height,
      {
        mass: GameSettings.motorcycle.mass * 0.7, // Most weight on chassis
        friction: 0.3,
        frictionAir: 0.02,
        restitution: 0.1
      }
    )
    
    // Create front wheel
    this.frontWheelBody = this.scene.matter.add.circle(
      this.x - 20, this.y + 15, 8,
      {
        mass: GameSettings.motorcycle.mass * 0.15,
        friction: 1.5, // High friction for traction
        frictionAir: 0.05,
        restitution: 0.3
      }
    )
    
    // Create back wheel
    this.backWheelBody = this.scene.matter.add.circle(
      this.x + 20, this.y + 15, 8,
      {
        mass: GameSettings.motorcycle.mass * 0.15,
        friction: 1.8, // Higher friction on back wheel (driving wheel)
        frictionAir: 0.05,
        restitution: 0.3
      }
    )
    
    // Create constraints to connect wheels to chassis
    this.frontConstraint = this.scene.matter.add.constraint(
      this.chassisBody,
      this.frontWheelBody,
      0, // length (0 = current distance)
      0.7, // stiffness
      {
        pointA: { x: -20, y: 15 },
        pointB: { x: 0, y: 0 },
        damping: 0.1
      }
    )
    
    this.backConstraint = this.scene.matter.add.constraint(
      this.chassisBody,
      this.backWheelBody,
      0, // length
      0.8, // stiffer back suspension
      {
        pointA: { x: 20, y: 15 },
        pointB: { x: 0, y: 0 },
        damping: 0.15
      }
    )
    
    // Set the main body for the container
    this.body = this.chassisBody
    
    // Link game objects to physics bodies
    this.scene.matter.add.gameObject(this.frontWheel, this.frontWheelBody)
    this.scene.matter.add.gameObject(this.backWheel, this.backWheelBody)
    this.scene.matter.add.gameObject(this, this.chassisBody)
  }

  public handleInput(isPressed: boolean): void {
    const MatterLib = Phaser.Physics.Matter.Matter
    
    if (this.isOnGround) {
      // On ground: accelerate or coast
      if (isPressed) {
        const currentSpeed = Math.abs(this.body.velocity.x)
        let torque = GameSettings.motorcycle.acceleration * 0.001 // Convert to torque
        
        // Detect slope based on velocity and rotation
        const isGoingUphill = this.body.velocity.y < -30 || this.currentSlope < -0.1
        const isReallyStuck = currentSpeed < GameSettings.motorcycle.minSpeed && isGoingUphill
        
        // Apply progressive power boost based on conditions
        if (isReallyStuck) {
          torque = GameSettings.motorcycle.boostPower * 0.001
          this.stuckTimer++
          
          // Add vertical boost to help climb
          if (this.stuckTimer > 30) {
            MatterLib.Body.applyForce(this.body, this.body.position, { x: 0, y: -0.05 })
          }
        } else if (isGoingUphill) {
          torque *= GameSettings.motorcycle.hillClimbPower
          this.stuckTimer = 0
        } else {
          this.stuckTimer = 0
        }
        
        // Apply torque multiplier for better grip
        torque *= GameSettings.motorcycle.torqueMultiplier
        
        // Apply turbo boost if active
        if (this.turboActive) {
          torque *= 2.0
          this.turboMultiplier = 2.0
        } else {
          this.turboMultiplier = 1.0
        }
        
        // Always maintain minimum speed
        if (currentSpeed < GameSettings.motorcycle.minSpeed) {
          torque *= 1.5
        }
        
        // Apply torque to back wheel for driving
        MatterLib.Body.setAngularVelocity(this.backWheelBody, torque * 10)
        
        // Apply forward force to chassis
        const forceDirection = this.body.angle
        const force = {
          x: Math.cos(forceDirection) * torque * 5,
          y: Math.sin(forceDirection) * torque * 5
        }
        MatterLib.Body.applyForce(this.body, this.body.position, force)
        
      } else {
        // When not pressing, apply small braking torque
        MatterLib.Body.setAngularVelocity(this.backWheelBody, this.backWheelBody.angularVelocity * 0.95)
        this.stuckTimer = 0
      }
    } else {
      // In air: flip control
      if (isPressed && !this.isFlipping) {
        this.startFlip()
      }
      
      // Better air control
      if (isPressed) {
        const airForce = GameSettings.motorcycle.acceleration * GameSettings.motorcycle.airControl * 0.0001
        MatterLib.Body.applyForce(this.body, this.body.position, { x: airForce, y: 0 })
      }
      
      this.stuckTimer = 0
    }
  }

  private startFlip(): void {
    this.isFlipping = true
    this.flipDirection = this.body.velocity.x >= 0 ? 1 : -1
    this.currentRotation = 0
  }

  public update(deltaTime: number): void {
    const dt = deltaTime / 1000
    const MatterLib = Phaser.Physics.Matter.Matter

    // Calculate current slope from body rotation
    this.currentSlope = Math.sin(this.body.angle)
    
    // Maintain minimum forward velocity when on ground
    if (this.isOnGround && this.body.velocity.x < GameSettings.motorcycle.minSpeed && this.body.velocity.x > 0) {
      MatterLib.Body.setVelocity(this.body, { x: GameSettings.motorcycle.minSpeed, y: this.body.velocity.y })
    }

    // Handle flipping
    if (this.isFlipping) {
      const flipTorque = GameSettings.motorcycle.flipSpeed * this.flipDirection * 0.01
      const MatterLib = Phaser.Physics.Matter.Matter
      MatterLib.Body.setAngularVelocity(this.body, flipTorque)
      
      this.currentRotation += GameSettings.motorcycle.flipSpeed * this.flipDirection * dt

      // Check for completed flip
      if (Math.abs(this.currentRotation) >= 360) {
        this.completedFlips++
        this.currentRotation = this.currentRotation % 360
        
        if (this.onFlipComplete) {
          this.onFlipComplete(1)
        }
      }
    }

    // Ground detection and landing logic
    this.updateGroundState()

    // Death condition: landing upside down (DISABLED FOR NOW)
    // this.checkLandingOrientation()

    // Keep the motorcycle on screen horizontally
    if (this.body.position.x < 50) {
      MatterLib.Body.setPosition(this.body, { x: 50, y: this.body.position.y })
      if (this.body.velocity.x < 0) {
        MatterLib.Body.setVelocity(this.body, { x: 0, y: this.body.velocity.y })
      }
    }

    // Sync container position with physics body  
    this.setPosition(this.body.position.x, this.body.position.y)
    this.setRotation(this.body.angle)
    
    // Death condition: fall off bottom of screen (DISABLED FOR NOW)
    // if (this.body.position.y > GameSettings.canvas.height + 100) {
    //   this.triggerDeath()
    // }
    
    // Sync visual wheels with physics bodies
    this.frontWheel.x = this.frontWheelBody.position.x
    this.frontWheel.y = this.frontWheelBody.position.y
    this.frontWheel.rotation = this.frontWheelBody.angle
    
    this.backWheel.x = this.backWheelBody.position.x
    this.backWheel.y = this.backWheelBody.position.y
    this.backWheel.rotation = this.backWheelBody.angle
  }

  private updateGroundState(): void {
    const wasOnGround = this.isOnGround
    
    // Check if any wheel is touching ground by checking their Y velocity
    // In Matter.js, we need to use collision detection or body position checking
    const groundThreshold = 5 // pixels per frame movement threshold
    const frontWheelGrounded = Math.abs(this.frontWheelBody.velocity.y) < groundThreshold
    const backWheelGrounded = Math.abs(this.backWheelBody.velocity.y) < groundThreshold
    
    this.isOnGround = frontWheelGrounded || backWheelGrounded

    // Just landed
    if (!wasOnGround && this.isOnGround) {
      this.onLanding()
    }

    // Just took off
    if (wasOnGround && !this.isOnGround) {
      this.wasInAir = true
    }
  }

  private onLanding(): void {
    const MatterLib = Phaser.Physics.Matter.Matter
    this.isFlipping = false
    
    // Snap rotation to nearest upright position if close enough
    const normalizedRotation = ((this.body.angle * 180 / Math.PI) % 360 + 360) % 360
    const uprightTolerance = 30 // degrees
    
    if (normalizedRotation <= uprightTolerance || normalizedRotation >= (360 - uprightTolerance)) {
      MatterLib.Body.setAngle(this.body, 0)
      this.currentRotation = 0
    }

    this.wasInAir = false
  }

  private checkLandingOrientation(): void {
    if (this.isOnGround && this.wasInAir) {
      const normalizedRotation = ((this.body.angle * 180 / Math.PI) % 360 + 360) % 360
      const uprightTolerance = 45 // degrees
      
      // Check if landed upside down (around 180 degrees)
      if (normalizedRotation > (180 - uprightTolerance) && normalizedRotation < (180 + uprightTolerance)) {
        this.triggerDeath()
      }
    }
  }

  public jump(): void {
    if (this.isOnGround) {
      const MatterLib = Phaser.Physics.Matter.Matter
      
      // Add forward momentum when jumping
      const jumpPower = this.turboActive 
        ? GameSettings.motorcycle.jumpPower * 1.3 
        : GameSettings.motorcycle.jumpPower
      
      // Apply upward force
      const jumpForce = jumpPower * 0.001
      MatterLib.Body.applyForce(this.body, this.body.position, { x: 0, y: -jumpForce })
      
      // Apply forward boost
      const forwardBoost = this.turboActive ? 1.4 : 1.2
      const currentVelX = this.body.velocity.x * forwardBoost
      MatterLib.Body.setVelocity(this.body, { x: currentVelX, y: this.body.velocity.y })
      
      this.isOnGround = false
      this.stuckTimer = 0
    }
  }
  
  public setTurbo(active: boolean): void {
    this.turboActive = active
    
    // Visual feedback for turbo
    if (active) {
      this.bikeSprite.setFillStyle(0xFF3333) // Red when turbo
    } else {
      this.bikeSprite.setFillStyle(0x333333) // Normal color
    }
  }

  public getVelocity(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.body.velocity.x, this.body.velocity.y)
  }

  public setPosition(x: number, y: number): this {
    super.setPosition(x, y)
    return this
  }

  private triggerDeath(): void {
    if (this.onDeath) {
      this.onDeath()
    }
  }

  public reset(x: number, y: number): void {
    const MatterLib = Phaser.Physics.Matter.Matter
    
    this.setPosition(x, y)
    
    // Reset chassis
    MatterLib.Body.setPosition(this.body, { x, y })
    MatterLib.Body.setVelocity(this.body, { x: GameSettings.motorcycle.minSpeed, y: 0 })
    MatterLib.Body.setAngularVelocity(this.body, 0)
    MatterLib.Body.setAngle(this.body, 0)
    
    // Reset wheels
    MatterLib.Body.setPosition(this.frontWheelBody, { x: x - 20, y: y + 15 })
    MatterLib.Body.setVelocity(this.frontWheelBody, { x: GameSettings.motorcycle.minSpeed, y: 0 })
    MatterLib.Body.setAngularVelocity(this.frontWheelBody, 0)
    
    MatterLib.Body.setPosition(this.backWheelBody, { x: x + 20, y: y + 15 })
    MatterLib.Body.setVelocity(this.backWheelBody, { x: GameSettings.motorcycle.minSpeed, y: 0 })
    MatterLib.Body.setAngularVelocity(this.backWheelBody, 0)
    
    this.rotation = 0
    this.currentRotation = 0
    this.isFlipping = false
    this.isOnGround = false
    this.completedFlips = 0
    this.wasInAir = false
    this.currentSlope = 0
    this.stuckTimer = 0
    this.turboActive = false
    this.turboMultiplier = 1.0
  }
}