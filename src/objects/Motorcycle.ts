import GameSettings from "../config/GameSettings"
import { ProjectilePhysics, TrajectoryPoint } from "../systems/ProjectilePhysics"
import { DynamicTerrain } from "../systems/DynamicTerrain"
import { LevelGenerator } from "../systems/LevelGenerator"

export class Motorcycle extends Phaser.GameObjects.Container {
  public body!: MatterJS.Body // Physics body for collision detection
  private terrain!: DynamicTerrain
  public levelGenerator!: LevelGenerator
  private bikeSprite!: Phaser.GameObjects.Rectangle
  private riderSprite!: Phaser.GameObjects.Rectangle
  private frontWheel!: Phaser.GameObjects.Arc
  private backWheel!: Phaser.GameObjects.Arc
  
  // Alto's Odyssey style physics
  private velocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0)
  private baseSpeed: number = 280 // Better base speed for good flow while staying controlled
  private maxSpeed: number = GameSettings.motorcycle.maxSpeed // Use GameSettings max speed
  private minSpeed: number = GameSettings.motorcycle.minSpeed // Use GameSettings min speed
  private gravity: number = GameSettings.motorcycle.gravity // Use GameSettings gravity
  private jumpPower: number = GameSettings.motorcycle.jumpPower // Use GameSettings jump power
  private slopeInfluence: number = 1.2 // Increased slope influence for more dramatic speed changes
  
  // Game state
  public isOnGround: boolean = true
  private isFlipping: boolean = false
  private completedFlips: number = 0
  private flipRotation: number = 0
  private airTime: number = 0 // Time in air for scoring
  private comboMultiplier: number = 1
  private currentTricks: string[] = [] // Track tricks in current combo
  public justJumpedOffRail: boolean = false // Flag to prevent rail physics for one frame
  private lastJumpTime: number = 0 // Timestamp of last jump to prevent double jumping
  
  // Crash detection
  public onCrash: (() => void) | null = null
  
  // Continuous flip controls
  private isInputHeld: boolean = false
  private flipSpeed: number = 360 // degrees per second when flipping (reduced for slower rotation)
  private autoCorrectSpeed: number = 30 // degrees per second for auto-correction (much weaker to allow crashes)
  private isAutoCorreting: boolean = false
  
  // Momentum-based launching
  private previousTerrainAngle: number = 0
  private launchThreshold: number = -0.5 // Minimum upward angle to trigger launch (radians)
  private momentumMultiplier: number = 0.6 // How much speed converts to launch power
  
  public onFlipComplete: ((flips: number) => void) | null = null
  public onLanding: (() => void) | null = null
  public onTrickComplete: ((tricks: string[], multiplier: number, airTime: number) => void) | null = null

  // Snow trail particle system
  private snowParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null

  // Rail grinding system
  public isGrinding: boolean = false
  public currentRail: any = null // Reference to the rail being ground
  private grindStartTime: number = 0
  private grindScore: number = 0
  private lastRailLogTime: number = 0
  private grindParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null
  public onGrindStart: (() => void) | null = null
  public onGrindEnd: ((grindTime: number, grindScore: number) => void) | null = null

  constructor(scene: Phaser.Scene, x: number, y: number, terrain: DynamicTerrain, levelGenerator?: LevelGenerator) {
    super(scene, x, y)
    
    this.terrain = terrain
    this.levelGenerator = levelGenerator!
    
    // Add container to scene
    scene.add.existing(this as any) // Type cast needed for Phaser container
    
    // Set depth to ensure motorcycle is visible above other objects
    this.setDepth(100)
    
    this.createSprites()
    this.setupPhysics()
    this.createSnowTrail()
    this.createGrindTrail()
    // this.createDebugCollisionVisual() // DISABLED - collision outline turned off
    
    // Position motorcycle on ground initially
    this.positionOnGround()
  }

  private createSprites(): void {
    console.log(`Creating sausage character at position: ${this.x}, ${this.y}`)
    
    // Use the sausage character image
    this.riderSprite = this.scene.add.image(-10, 140, 'player') as any
    this.riderSprite.setScale(0.32) // Increased scale for bigger and more visible player (75% larger)
    this.riderSprite.setOrigin(0.5, 1.0) // Center horizontally, bottom of image at ground level
    this.add(this.riderSprite)

    // Use invisible rectangle for bikeSprite compatibility
    this.bikeSprite = this.scene.add.rectangle(0, 0, 1, 1, 0x000000, 0)
    this.bikeSprite.setVisible(false)
    this.add(this.bikeSprite)

    // Store references to wheels as dummy objects for compatibility
    this.frontWheel = this.scene.add.circle(0, 0, 1, 0x000000, 0)
    this.frontWheel.setVisible(false)
    this.backWheel = this.scene.add.circle(0, 0, 1, 0x000000, 0)
    this.backWheel.setVisible(false)
    
    // Make sure container is visible
    this.setAlpha(1)
    this.setVisible(true)
    this.setDepth(100)
    
    console.log(`Sausage character created`)
  }

  private setupPhysics(): void {
    // REVERTED: Use sensor body to avoid interference with normal gameplay
    // The grinding will work through distance-based detection, not physics collision
    const bottomOffset = 30 // Position collision body at bottom of sprite (proportionally larger)
    this.body = this.scene.matter.add.circle(
      this.x, this.y + bottomOffset, 22, // Larger collision body (50% bigger: 15 -> 22)
      {
        isSensor: true, // SENSOR body - no physical collision but detects overlaps
        label: 'motorcycle', // Match the label expected in collision detection
        isStatic: false,
        // Set collision filter to match rail expectations for collision events
        collisionFilter: {
          category: 0x0001, // Player category that rails expect
          mask: 0x0002      // Detect collision with rails (category 0x0002)
        }
      }
    ) as MatterJS.Body
    
    // Store reference to this motorcycle on the body for collision detection
    (this.body as any).gameObject = this
    
    // Don't use gameObject integration to avoid physics control conflicts
    // this.scene.matter.add.gameObject(this, this.body)
    
    console.log("🔧 Motorcycle SENSOR physics body created (collision detection only)")
    console.log("🔧 Body ID:", (this.body as any).id)
    console.log("🔧 Body label:", (this.body as any).label)
    console.log("🔧 Body isSensor:", (this.body as any).isSensor)
    console.log("🔧 Body collision category:", this.body.collisionFilter.category)
    console.log("🔧 Body collision mask:", this.body.collisionFilter.mask)
  }

  private debugCollisionVisual?: Phaser.GameObjects.Graphics

  private createDebugCollisionVisual(): void {
    // Create a red circle to show where the collision body is
    this.debugCollisionVisual = this.scene.add.graphics()
    this.debugCollisionVisual.lineStyle(2, 0xFF0000, 1.0) // Red outline
    this.debugCollisionVisual.fillStyle(0xFF0000, 0.3) // Semi-transparent red fill
    this.debugCollisionVisual.fillCircle(0, 30, 22) // Bottom of motorcycle, 22px radius (updated for larger size)
    this.debugCollisionVisual.strokeCircle(0, 30, 22)
    
    // Add text label
    const debugText = this.scene.add.text(0, 55, 'COLLISION', {
      fontSize: '6px',
      color: '#FF0000',
      backgroundColor: '#FFFFFF',
      fontFamily: 'pressStart2P'
    })
    debugText.setOrigin(0.5, 0.5)
    
    this.add([this.debugCollisionVisual, debugText])
    console.log("🔴 DEBUG: Motorcycle collision body visualized with red circle")
  }

  private updateCollisionBody(): void {
    if (this.body && this.scene.matter && (this.scene.matter as any).Matter) {
      const Matter = (this.scene.matter as any).Matter
      const bottomOffset = 30 // Same offset as in setupPhysics (proportionally larger)
      
      // Keep collision body at bottom of motorcycle sprite
      const bottomX = this.x
      const bottomY = this.y + bottomOffset
      
      Matter.Body.setPosition(this.body, { x: bottomX, y: bottomY })
      
      // Debug: Update visual collision indicator position (it's relative to container)
      // The visual is already positioned at offset 20, so no need to update
    }
  }

  private createSnowTrail(): void {
    // Create realistic snow pickup trail with simpler API
    const emitterConfig = {
      speed: { min: 60, max: 150 },
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 1.0, end: 0.0 },
      lifespan: 1000,
      frequency: 20,
      quantity: 5,
      angle: { min: 150, max: 210 }, // Spray behind player
      gravityY: 100,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-25, 0, 50, 15)
      }
    }
    
    this.snowParticles = this.scene.add.particles(this.x, this.y, 'snow-particle', emitterConfig)
    
    // Set depth and visibility
    this.snowParticles.setDepth(50)
    this.snowParticles.setVisible(true)
    
    // Start stopped
    this.snowParticles.stop()
    
    console.log("Snow trail particle emitter created")
  }

  private createGrindTrail(): void {
    // Create sparkling grind particles for rail grinding
    const grindConfig = {
      speed: { min: 80, max: 200 },
      scale: { start: 0.6, end: 0.0 },
      alpha: { start: 1.0, end: 0.0 },
      lifespan: 600,
      frequency: 10, // More frequent for intense grinding effect
      quantity: 8,
      angle: { min: 45, max: 135 }, // Spray upward and to sides
      gravityY: 200,
      tint: [0xFFD700, 0xFFA500, 0xFF4500], // Gold/orange sparks
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-15, -5, 30, 10)
      }
    }
    
    this.grindParticles = this.scene.add.particles(this.x, this.y, 'snow-particle', grindConfig)
    
    // Set depth and visibility
    this.grindParticles.setDepth(75) // Above snow, below player
    this.grindParticles.setVisible(true)
    
    // Start stopped
    this.grindParticles.stop()
    
    console.log("Grind trail particle emitter created")
  }

  private positionOnGround(): void {
    // Wait a frame for terrain to be initialized, then position snowboarder
    this.scene.time.delayedCall(100, () => {
      let terrainHeight = GameSettings.level.groundY
      
      if (this.levelGenerator) {
        terrainHeight = this.getTerrainHeightFromChunks(this.x)
      } else {
        terrainHeight = this.terrain.getHeightAtX(this.x)
      }
      
      this.y = terrainHeight - 30 // Position on terrain (matching collision detection, proportionally larger)
      this.isOnGround = true // Make sure we start on ground
      this.velocity.y = 0 // No initial vertical velocity
      console.log(`Snowboarder positioned on ground at: ${this.x}, ${this.y}, terrain height: ${terrainHeight}`)
    })
  }

  public getVelocity(): Phaser.Math.Vector2 {
    return this.velocity
  }

  public handleInput(isPressed: boolean): void {
    const wasInputHeld = this.isInputHeld
    this.isInputHeld = isPressed
    
    // Handle initial press for jumping
    if (isPressed && !wasInputHeld) {
      const currentTime = this.scene.time.now
      const timeSinceLastJump = currentTime - this.lastJumpTime
      
      // IMMEDIATE RAIL JUMP: Allow instant jumping when grinding
      if (this.isGrinding) {
        console.log(`🚂 IMMEDIATE RAIL JUMP: Jumping off rail instantly`)
        this.lastJumpTime = currentTime
        
        // IMMEDIATE jump off rail - no delays or complex state management
        this.velocity.y = -this.jumpPower
        this.isOnGround = false
        this.isGrinding = false
        this.currentRail = null
        this.grindScore = 0
        
        // Stop grind particles immediately
        if (this.grindParticles) {
          this.grindParticles.stop()
        }
        
        // Hide grind display immediately
        if (this.scene && (this.scene as any).scoreManager) {
          const scoreManager = (this.scene as any).scoreManager
          scoreManager.endGrindDisplay(this.grindScore, 0.1) // Very short grind time for immediate jump
        }
        
        // Longer flag to prevent immediate re-grinding (300ms)
        this.justJumpedOffRail = true
        this.scene.time.delayedCall(300, () => {
          this.justJumpedOffRail = false
          console.log(`🟢 RAIL JUMP FLAG CLEARED: Can grind again`)
        })
        
        console.log(`🚂 RAIL JUMP COMPLETE: velY=${this.velocity.y}, isGrinding=${this.isGrinding}`)
        return
      }
      
      // Normal ground jumping with cooldown
      const jumpCooldown = 300
      const canJumpStrict = this.isOnGround || this.canJumpFromGround()
      const cooldownPassed = timeSinceLastJump > jumpCooldown
      
      if (canJumpStrict && cooldownPassed) {
        console.log(`🦘 GROUND JUMP: on ground=${this.isOnGround}, canJump=${this.canJumpFromGround()}, cooldown=${timeSinceLastJump.toFixed(0)}ms`)
        this.lastJumpTime = currentTime
        this.jump()
        return
      } else {
        const reason = !cooldownPassed ? `cooldown (${timeSinceLastJump.toFixed(0)}ms < ${jumpCooldown}ms)` : `not on ground`
        console.log(`🚫 JUMP DENIED: ${reason}, onGround=${canJumpStrict}`)
      }
    }
    
    // Handle continuous flipping only when truly airborne
    if (this.isTrulyAirborne()) {
      if (isPressed) {
        if (!this.isFlipping) {
          // Start flipping - change to flipping image and adjust position/scale
          (this.riderSprite as any).setTexture('player_flipping');
          this.riderSprite.setPosition(0, 120); // Move down closer to ground (adjusted for larger sprite)
          this.riderSprite.setScale(0.35); // Proportionally larger scale for flipping image
        }
        this.isFlipping = true
        this.isAutoCorreting = false
      } else {
        if (this.isFlipping) {
          // Stop flipping - change back to normal image and restore position/scale
          (this.riderSprite as any).setTexture('player');
          this.riderSprite.setPosition(-10, 140); // Restore original position (adjusted for larger sprite)
          this.riderSprite.setScale(0.32); // Restore original scale (proportionally larger)
        }
        this.isFlipping = false
        // Check if we need auto-correction
        this.checkAutoCorrection()
      }
    } else {
      // On ground or touching terrain - no flipping allowed
      if (this.isFlipping) {
        // Stop flipping - change back to normal image and restore position/scale
        (this.riderSprite as any).setTexture('player');
        this.riderSprite.setPosition(-10, 140); // Restore original position (adjusted for larger sprite)
        this.riderSprite.setScale(0.32); // Restore original scale (proportionally larger)
      }
      this.isFlipping = false
      this.isAutoCorreting = false
    }
  }

  public jump(): void {
    // This method is now only used for ground jumping
    // Rail jumping is handled directly in handleInput() for immediate response
    
    // Check if motorcycle is close enough to terrain to jump (more lenient than isOnGround)
    if (this.canJumpFromGround()) {
      // Jump perpendicular to the terrain for realistic physics
      let terrainAngle = 0
      if (this.levelGenerator) {
        terrainAngle = this.getTerrainAngleFromChunks(this.x)
      } else {
        terrainAngle = this.terrain.getSlopeAngleAtX(this.x)
      }
      
      // Speed-based jump power system - higher minimum for better gameplay
      const minJumpPower = 350 // Higher minimum jump height for better gameplay at slow speeds
      const maxJumpPower = 600 // Maximum jump height
      
      // Calculate speed ratio (0 to 1)
      const speedRatio = Math.min(1, Math.max(0, (this.velocity.x - this.minSpeed) / (this.maxSpeed - this.minSpeed)))
      
      // Jump power scales linearly with speed
      const jumpPower = minJumpPower + (speedRatio * (maxJumpPower - minJumpPower))
      
      console.log(`Jump power: ${jumpPower.toFixed(0)} (speed: ${this.velocity.x.toFixed(0)}, ratio: ${speedRatio.toFixed(2)})`)
      
      // Calculate jump vector with forward bias
      const perpendicularAngle = terrainAngle - Math.PI/2 // 90 degrees from terrain
      const forwardAngle = -Math.PI/4 // Always 45 degrees up-forward
      
      // Blend perpendicular jump with forward jump based on terrain steepness
      const forwardBias = Math.min(Math.abs(terrainAngle) * 1.5, 0.4) // Reduced forward bias and max
      const finalAngle = perpendicularAngle * (1 - forwardBias) + forwardAngle * forwardBias
      
      const jumpVelocityX = Math.cos(finalAngle) * jumpPower
      const jumpVelocityY = Math.sin(finalAngle) * jumpPower
      
      // Ensure minimum forward velocity (reduced)
      const minForwardVelocity = jumpPower * 0.15 // Reduced minimum forward component
      const finalVelocityX = Math.max(jumpVelocityX, minForwardVelocity)
      
      // Add jump velocity to current velocity (reduced power)
      this.velocity.x += finalVelocityX * 0.25 // Reduced forward boost
      this.velocity.y += jumpVelocityY
      
      this.isOnGround = false
      console.log(`Snowboarder jumped! Power: ${jumpPower.toFixed(0)}, Speed: ${this.velocity.x.toFixed(0)}`)
    }
  }

  private isTrulyAirborne(): boolean {
    // Check if snowboarder is actually clear of terrain (not just flagged as off-ground)
    let terrainHeight = GameSettings.level.groundY
    
    if (this.levelGenerator) {
      terrainHeight = this.getTerrainHeightFromChunks(this.x)
    } else {
      terrainHeight = this.terrain.getHeightAtX(this.x)
    }
    
    const snowboarderBottom = this.y + 30 // Account for snowboarder height from center (proportionally larger)
    const clearanceThreshold = 15 // Must be at least 15 pixels clear of terrain
    
    return snowboarderBottom < (terrainHeight - clearanceThreshold)
  }

  private groundCheckStability: number = 0 // Track ground stability

  private canJumpFromGround(): boolean {
    // More lenient check for jumping - allows jumping when close to terrain
    let terrainHeight = GameSettings.level.groundY
    
    if (this.levelGenerator) {
      terrainHeight = this.getTerrainHeightFromChunks(this.x)
    } else {
      terrainHeight = this.terrain.getHeightAtX(this.x)
    }
    
    const motorcycleBottom = this.y + 30 // Account for motorcycle height from center (proportionally larger)
    let jumpThreshold = 50 // Moderately forgiving base jump threshold for rolling hills
    
    // Make jumping more forgiving with high speed
    if (this.velocity.x > this.baseSpeed * 1.2) {
      // High speed = more forgiving jump
      jumpThreshold = 70
    }
    
    // Get terrain angle to detect slopes
    const terrainAngle = this.levelGenerator ? 
      this.getTerrainAngleFromChunks(this.x) : 
      this.terrain.getSlopeAngleAtX(this.x)
    
    // Make jumping extra forgiving on ANY slope (uphill or downhill)
    const slopeStrength = Math.abs(terrainAngle)
    if (slopeStrength > 0.1) { // Gentle slopes get extra forgiveness
      jumpThreshold = 80 // Forgiving on slopes
      
      // More forgiving on steep slopes
      if (slopeStrength > 0.3) {
        jumpThreshold = 100 // Very forgiving on steep slopes
      }
    }
    
    // Special case: if going uphill with good speed, be extra lenient
    if (terrainAngle < -0.2 && this.velocity.x > this.baseSpeed * 1.3) {
      jumpThreshold = 120 // Extra forgiving for uphill momentum jumps
    }
    
    const canJump = motorcycleBottom >= (terrainHeight - jumpThreshold)
    
    // Debug logging to help understand jump availability
    if (Math.random() < 0.02) { // 2% chance to log
      const distance = terrainHeight - motorcycleBottom
      console.log(`🦘 JUMP CHECK: distance=${distance.toFixed(1)}px, threshold=${jumpThreshold}px, canJump=${canJump}, slope=${(terrainAngle * 180/Math.PI).toFixed(1)}°`)
    }
    
    return canJump
  }

  private checkForCrash(): boolean {
    // SAFETY CHECK: Only crash when landing from air, never when already on ground
    if (this.isOnGround) {
      console.log(`✅ SAFE: Player already on ground - no crash possible during ground movement`)
      return false
    }
    
    // Get terrain angle and height at player position
    let terrainHeight = GameSettings.level.groundY
    let terrainAngle = 0
    
    if (this.levelGenerator) {
      terrainHeight = this.getTerrainHeightFromChunks(this.x)
      terrainAngle = this.getTerrainAngleFromChunks(this.x)
    } else {
      terrainHeight = this.terrain.getHeightAtX(this.x)
      // DynamicTerrain doesn't have getAngleAtX, so calculate it manually
      const sampleDistance = 10
      const leftHeight = this.terrain.getHeightAtX(this.x - sampleDistance)
      const rightHeight = this.terrain.getHeightAtX(this.x + sampleDistance)
      terrainAngle = Math.atan2(rightHeight - leftHeight, sampleDistance * 2)
    }
    
    // Convert player rotation to degrees for easier calculation
    const playerRotationDeg = (this.rotation * 180 / Math.PI) % 360
    const terrainAngleDeg = terrainAngle * 180 / Math.PI
    
    // Calculate the ideal landing angle (matching terrain slope)
    const idealLandingAngle = terrainAngleDeg
    
    // Calculate how far off the player's rotation is from the ideal landing angle
    let angleDifference = Math.abs(playerRotationDeg - idealLandingAngle)
    
    // Handle angle wrapping (e.g., -10° vs 350° should be 20° difference, not 360°)
    if (angleDifference > 180) {
      angleDifference = 360 - angleDifference
    }
    
    // Extremely forgiving tolerance: 90° deviation allowed from terrain angle
    const landingTolerance = 90
    
    console.log(`🔍 LANDING CHECK: Player: ${playerRotationDeg.toFixed(1)}°, Terrain: ${terrainAngleDeg.toFixed(1)}°, Difference: ${angleDifference.toFixed(1)}°, Tolerance: ${landingTolerance}°`)
    
    // Crash if player rotation doesn't match terrain angle within tolerance
    if (angleDifference > landingTolerance) {
      console.log(`💥 CRASH! Bad landing angle - difference: ${angleDifference.toFixed(1)}° > tolerance: ${landingTolerance}°`)
      return true
    }
    
    console.log(`✅ SAFE: Good landing angle within tolerance`)
    return false
  }

  private checkAutoCorrection(): void {
    if (this.isTrulyAirborne()) {
      // Check if motorcycle is upside down (rotation between 90 and 270 degrees)
      const normalizedRotation = ((this.rotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2)
      const isUpsideDown = normalizedRotation > Math.PI/2 && normalizedRotation < (Math.PI * 3/2)
      
      if (isUpsideDown) {
        this.isAutoCorreting = true
        console.log("Auto-correcting snowboarder rotation")
      }
    }
  }

  public update(deltaTime: number): void {
    // Clamp deltaTime to prevent physics stutters from large frame spikes
    const clampedDeltaTime = Math.min(deltaTime, 33.33) // Max 30 FPS equivalent
    const dt = clampedDeltaTime / 1000

    // RAIL RIDING MODE: Override normal physics when grinding
    // BUT: Skip completely if we just jumped off a rail
    if (this.justJumpedOffRail) {
      console.log("🟡 SKIPPING RAIL PHYSICS: Just jumped off rail, using normal physics")
    }
    
    if (this.isGrinding && this.currentRail && !this.justJumpedOffRail) {
      // SIMPLIFIED RAIL PHYSICS: Just follow the rail, don't override jump velocity
      const railRotation = this.currentRail.rotation || 0
      const railCenterX = this.currentRail.x
      const railCenterY = this.currentRail.y
      
      // Move horizontally along rail
      this.x += this.velocity.x * dt
      
      // Calculate player position relative to rail center
      const deltaX = this.x - railCenterX
      
      // Check rail boundaries - exit if too far
      const railHalfWidth = 150 // 300px wide rail / 2
      const exitBuffer = 80
      
      if (Math.abs(deltaX) > railHalfWidth + exitBuffer) {
        console.log(`🔴 RAIL BOUNDARY EXIT: Player moved off rail`)
        this.isGrinding = false
        this.currentRail = null
        this.isOnGround = false // Let physics determine ground state
        if (this.grindParticles) this.grindParticles.stop()
      } else {
        // Follow rail slope for Y position
        if (Math.abs(railRotation) > 0.01) {
          const slopeY = deltaX * Math.tan(railRotation)
          this.y = railCenterY + slopeY - 25
        } else {
          this.y = railCenterY - 25
        }
        
        // Only set ground state if not jumping (don't override jump velocity)
        if (this.velocity.y >= -50) {
          this.velocity.y = 0
          this.isOnGround = true
        }
      }
    } else {
      // Normal terrain following mode
      this.updateVelocityBasedOnTerrain(dt)
      
      // Apply movement
      this.x += this.velocity.x * dt
      this.y += this.velocity.y * dt
    }
    
    // Update collision body to stay at bottom of motorcycle
    this.updateCollisionBody()
    
    // No height limit - allow unlimited jumping

    // Apply gravity when in air and track air time
    if (!this.isOnGround) {
      this.velocity.y += this.gravity * dt
      this.airTime += dt
      
      // Apply air friction to horizontal velocity (slight)
      this.velocity.x *= GameSettings.physics.airFriction
    } else {
      // Reset air time when on ground
      if (this.airTime > 0) {
        this.airTime = 0
      }
    }
    
    // Final minimum speed enforcement AFTER all physics updates
    if (this.isOnGround && this.velocity.x < this.minSpeed) {
      this.velocity.x = this.minSpeed
    }

    // Update snow trail
    this.updateSnowTrail()

    // Update grind trail
    this.updateGrindTrail()

    // Rail alignment is now handled in main update loop - no need for separate maintenance

    // Handle continuous flipping and auto-correction
    if (this.isTrulyAirborne()) {
      if (this.isFlipping) {
        // Continuous flipping while input is held (backflips - counter-clockwise)
        const rotationChange = this.flipSpeed * dt * (Math.PI / 180) // Convert to radians
        this.rotation -= rotationChange // Changed to negative for backflips
        
        // Track completed flips for scoring
        this.flipRotation += this.flipSpeed * dt
        
        while (this.flipRotation >= 360) {
          this.completedFlips++
          this.currentTricks.push("360 Spin")
          this.flipRotation -= 360
          
          if (this.onFlipComplete) {
            this.onFlipComplete(1)
          }
        }
      } else if (this.isAutoCorreting) {
        // Auto-correct rotation to upright position
        const targetRotation = 0 // Upright
        const currentRotation = this.rotation
        
        // Find shortest rotation direction
        let rotationDiff = targetRotation - currentRotation
        
        // Normalize to [-π, π]
        while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI
        while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI
        
        // Apply auto-correction rotation
        const correctionSpeed = this.autoCorrectSpeed * dt * (Math.PI / 180)
        
        if (Math.abs(rotationDiff) < correctionSpeed) {
          // Close enough, snap to upright
          this.rotation = targetRotation
          this.isAutoCorreting = false
          this.flipRotation = 0
        } else {
          // Continue correcting
          this.rotation += Math.sign(rotationDiff) * correctionSpeed
        }
      }
    }

    // Ground collision detection
    this.checkGroundCollision(dt)

    // Update terrain rotation when on ground (for continuous slope following)
    if (this.isOnGround && !this.isFlipping) {
      this.updateTerrainRotation(dt)
    }

    // Update wheel rotation for visual effect
    this.updateWheelRotation(dt)
    
    // CRITICAL: Final velocity clamping to prevent physics explosions
    const beforeClampX = this.velocity.x
    const beforeClampY = this.velocity.y
    // Use much tighter velocity limits based on game settings
    const maxVelX = this.maxSpeed * 1.2 // Allow 20% over max speed for brief moments
    const maxVelY = 2000 // Reasonable vertical velocity limit
    this.velocity.x = Phaser.Math.Clamp(this.velocity.x, -maxVelX, maxVelX)
    this.velocity.y = Phaser.Math.Clamp(this.velocity.y, -maxVelY, maxVelY)
    
    // Debug extreme velocity
    if (Math.abs(beforeClampY) > 3000) {
      console.log("🚨 EXTREME VELOCITY DETECTED: Y was", beforeClampY.toFixed(1), "clamped to", this.velocity.y.toFixed(1))
    }
    
    // Update physics body position and velocity to match visual position
    if (this.body && this.scene.matter && (this.scene.matter as any).Matter) {
      const Matter = (this.scene.matter as any).Matter
      Matter.Body.setPosition(this.body, { x: this.x, y: this.y })
      
      // CRITICAL: Also clamp the Matter.js body velocity to match our clamped values
      Matter.Body.setVelocity(this.body, { x: this.velocity.x, y: this.velocity.y })
    }
    
    // Flag clearing is now handled by timer in handleInput() for precise timing
  }

  private updateVelocityBasedOnTerrain(dt: number): void {
    if (this.isOnGround) {
      // Get terrain angle at current position
      let terrainAngle = 0
      if (this.levelGenerator) {
        terrainAngle = this.getTerrainAngleFromChunks(this.x)
      } else {
        terrainAngle = this.terrain.getSlopeAngleAtX(this.x)
      }

      // Convert terrain angle to speed influence (-1 = steep uphill, 1 = steep downhill)
      const slopeInfluence = Math.sin(terrainAngle) * this.slopeInfluence
      
      // Simplified acceleration system
      let accelerationMultiplier = 2.0 // Base acceleration rate
      
      if (slopeInfluence > 0) {
        // Downhill - modest speed increase
        accelerationMultiplier = 2.5 + (slopeInfluence * 0.5) // Gentle downhill acceleration
      } else if (slopeInfluence < 0) {
        // Uphill - maintain decent performance
        accelerationMultiplier = 1.8 // Consistent uphill acceleration
      }
      
      // Simple target speed calculation
      let targetSpeed = this.baseSpeed + (slopeInfluence * (this.maxSpeed - this.baseSpeed) * 0.6)
      
      // Controlled speed limits - no excessive bonuses
      const maxSpeedLimit = this.maxSpeed + 50 // Small headroom for variety
      const clampedSpeed = Phaser.Math.Clamp(targetSpeed, this.minSpeed, maxSpeedLimit)
      
      // Apply acceleration with terrain-specific multiplier - more responsive
      const speedDiff = clampedSpeed - this.velocity.x
      const responsiveAcceleration = Math.max(accelerationMultiplier * dt, 0.1) // Minimum 10% change per frame
      const cappedAcceleration = Math.min(responsiveAcceleration, 0.8) // CRITICAL: Cap acceleration to prevent velocity explosions
      this.velocity.x += speedDiff * cappedAcceleration
      
      // Keep vertical velocity aligned with terrain when on ground only for slopes
      if (Math.abs(terrainAngle) > 0.01) { // Only adjust for actual slopes
        const slopeVelocityY = this.velocity.x * Math.tan(terrainAngle)
        // CRITICAL: Clamp vertical velocity to prevent physics explosions
        this.velocity.y = Phaser.Math.Clamp(slopeVelocityY, -2000, 2000)
      } else {
        this.velocity.y = 0 // No vertical movement on flat ground
      }
    }
  }

  private checkGroundCollision(dt: number): void {
    // CRITICAL FIX: Don't do ground collision when grinding - let rail physics handle position
    if (this.isGrinding) {
      return // Skip all ground collision logic when grinding
    }
    
    let terrainHeight = GameSettings.level.groundY
    
    // Get terrain height from LevelGenerator if available
    if (this.levelGenerator) {
      terrainHeight = this.getTerrainHeightFromChunks(this.x)
    } else {
      // Fallback to DynamicTerrain
      terrainHeight = this.terrain.getHeightAtX(this.x)
    }
    
    const motorcycleBottom = this.y + 30 // Account for motorcycle height from center (proportionally larger)
    const targetY = terrainHeight - 30 // Where we want to be (proportionally larger)
    
    // Check for terrain drop - if terrain is significantly below current position, let motorcycle fall naturally
    const terrainDropThreshold = 50 // pixels - adjust this to control sensitivity
    const isTerrainDrop = this.isOnGround && (terrainHeight > this.y + terrainDropThreshold)
    
    if (motorcycleBottom >= terrainHeight && !isTerrainDrop) {
      // Increase stability counter when we should be on ground
      this.groundCheckStability = Math.min(this.groundCheckStability + 1, 10)
      
      // Landing logic - no slow interpolation
      if (!this.isOnGround) {
        // Just landed from being in air - check for crash BEFORE positioning
        if (this.checkForCrash()) {
          // Crashed! Game over
          console.log("Snowboarder crashed on landing!")
          if (this.onCrash) {
            this.onCrash()
          }
          return // Don't process normal landing
        }
        
        // Landing from air - snap to terrain immediately (after crash check)
        this.y = targetY
      } else {
        // Already on ground - follow terrain naturally without interpolation
        this.y = targetY
      }
      
      if (!this.isOnGround) {
        
        this.isOnGround = true
        
        // Reset jump cooldown when landing to allow immediate next jump
        this.lastJumpTime = 0
        
        // Absorb some vertical velocity on landing, keep horizontal momentum
        this.velocity.y *= 0.1 // Dampen vertical bounce
        
        // Reset all flip states
        this.isFlipping = false;
        this.isAutoCorreting = false;
        this.flipRotation = 0;
        
        // Change back to normal image when landing and restore position/scale
        (this.riderSprite as any).setTexture('player');
        this.riderSprite.setPosition(-10, 140); // Restore original position (adjusted for larger sprite)
        this.riderSprite.setScale(0.32); // Restore original scale (proportionally larger)
        
        // Process trick combo on landing
        this.processLandingTricks()
        
        console.log("Snowboarder landed safely!")
        
        if (this.onLanding) {
          this.onLanding()
        }
      } else {
        // Already on ground - check for momentum launches
        this.checkMomentumLaunch(terrainHeight)
      }
      
      // Update rotation to match terrain slope when on ground
      if (this.isOnGround && !this.isFlipping) {
        this.updateTerrainRotation(dt)
      }
    } else {
      // Above terrain or terrain drop detected - should be in air
      // Decrease stability counter when not on ground
      this.groundCheckStability = Math.max(this.groundCheckStability - 2, 0)
      
      // Set airborne more aggressively to prevent slow motion
      if (this.isOnGround && this.groundCheckStability <= 2) {
        if (isTerrainDrop) {
          this.isOnGround = false
          console.log("Motorcycle fell off terrain drop")
        } else if (motorcycleBottom < terrainHeight - 10) { // Reduced threshold for quicker air detection
          this.isOnGround = false
          console.log("Motorcycle left ground")
        }
      }
    }
  }

  private getTerrainHeightFromChunks(x: number): number {
    // Find the terrain height from LevelGenerator chunks
    const chunks = this.levelGenerator.getChunks()
    
    for (const chunk of chunks) {
      if (x >= chunk.x && x <= chunk.x + chunk.width) {
        // Found the chunk containing this x position
        if (chunk.terrainPath && chunk.terrainPath.length > 0) {
          // Interpolate between terrain path points
          for (let i = 0; i < chunk.terrainPath.length - 1; i++) {
            const p1 = chunk.terrainPath[i]
            const p2 = chunk.terrainPath[i + 1]
            
            if (x >= p1.x && x <= p2.x) {
              // Interpolate between these two points
              const t = (x - p1.x) / (p2.x - p1.x)
              return p1.y + t * (p2.y - p1.y)
            }
          }
          // Return first point if no interpolation found
          return chunk.terrainPath[0].y
        }
        // Fallback to ground level
        return GameSettings.level.groundY
      }
    }
    
    // No chunk found, return ground level
    return GameSettings.level.groundY
  }

  private getTerrainAngleFromChunks(x: number): number {
    // Calculate terrain angle from LevelGenerator chunks
    const chunks = this.levelGenerator.getChunks()
    
    for (const chunk of chunks) {
      if (x >= chunk.x && x <= chunk.x + chunk.width) {
        // Found the chunk containing this x position
        if (chunk.terrainPath && chunk.terrainPath.length > 1) {
          // Find the two nearest points for slope calculation
          for (let i = 0; i < chunk.terrainPath.length - 1; i++) {
            const p1 = chunk.terrainPath[i]
            const p2 = chunk.terrainPath[i + 1]
            
            if (x >= p1.x && x <= p2.x) {
              // Calculate angle between these two points
              const deltaY = p2.y - p1.y
              const deltaX = p2.x - p1.x
              return Math.atan2(deltaY, deltaX)
            }
          }
        }
      }
    }
    
    return 0 // No slope found
  }

  private checkMomentumLaunch(terrainHeight: number): void {
    // Get current terrain angle
    let currentTerrainAngle = 0
    if (this.levelGenerator) {
      currentTerrainAngle = this.getTerrainAngleFromChunks(this.x)
    } else {
      currentTerrainAngle = this.terrain.getSlopeAngleAtX(this.x)
    }
    
    // Detect ramp launch conditions - look for upward ramps with sufficient speed
    const isUpwardRamp = currentTerrainAngle < -0.2 // Strong upward slope
    const hasSpeed = this.velocity.x > this.baseSpeed * 1.3 // Need good speed for launch
    const significantRamp = Math.abs(currentTerrainAngle) > 0.2 // Must be a real ramp, not just bumpy terrain
    
    // Check for ramp launch conditions
    if (isUpwardRamp && hasSpeed && significantRamp) {
      // Convert horizontal momentum to launch velocity (REDUCED)
      const speedBonus = (this.velocity.x - this.baseSpeed) / (this.maxSpeed - this.baseSpeed)
      const launchPower = speedBonus * this.momentumMultiplier * 150 // Reduced from 400 to 150
      
      // Add jump boost if player is holding input (REDUCED)
      const jumpBoost = this.isInputHeld ? 80 : 0 // Reduced from 200 to 80
      
      // Cap the total launch power
      const totalLaunchPower = Math.min(launchPower + jumpBoost, 300) // Maximum 300 launch power
      
      // Launch the motorcycle
      this.velocity.y = -totalLaunchPower
      this.isOnGround = false
      
      console.log(`Momentum launch! Speed: ${this.velocity.x.toFixed(0)}, Launch power: ${totalLaunchPower.toFixed(0)}`)
    } else {
      // Normal ground following
      this.velocity.y = 0
    }
    
    // Update previous angle for next frame
    this.previousTerrainAngle = currentTerrainAngle
  }

  private updateTerrainRotation(dt: number = 0.016): void {
    let terrainAngle = 0
    
    if (this.levelGenerator) {
      terrainAngle = this.getTerrainAngleFromChunks(this.x)
    } else {
      terrainAngle = this.terrain.getSlopeAngleAtX(this.x)
    }
    
    // Smooth rotation interpolation
    const rotationSpeed = 5 // Adjust for smoother/faster rotation
    const targetRotation = terrainAngle
    const currentRotation = this.rotation
    
    // Use angular interpolation for smooth rotation
    let angleDiff = targetRotation - currentRotation
    
    // Normalize angle difference to [-π, π]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
    
    // Apply smooth rotation using actual deltaTime
    this.rotation = currentRotation + angleDiff * rotationSpeed * dt
  }

  private processLandingTricks(): void {
    if (this.currentTricks.length > 0 || this.airTime > 0.5) {
      // Calculate score based on tricks and air time
      let baseScore = Math.floor(this.airTime * 100) // Base points for air time
      
      // Add points for each trick
      this.currentTricks.forEach(trick => {
        if (trick === "360 Spin") {
          baseScore += 500
        }
      })
      
      // Calculate multiplier based on air time and trick count
      this.comboMultiplier = Math.floor(1 + (this.airTime / 2) + (this.currentTricks.length * 0.5))
      
      // Add style points for long air time
      if (this.airTime > 2) {
        this.currentTricks.push("Big Air")
        baseScore += 300
      }
      
      if (this.airTime > 3) {
        this.currentTricks.push("Massive Air")  
        baseScore += 500
      }
      
      // Notify about completed combo
      if (this.onTrickComplete && (this.currentTricks.length > 0 || this.airTime > 0.5)) {
        this.onTrickComplete(this.currentTricks, this.comboMultiplier, this.airTime)
      }
    }
    
    // Reset for next combo
    this.currentTricks = []
    this.airTime = 0
    this.comboMultiplier = 1
  }

  private updateWheelRotation(deltaTime: number): void {
    // Rotate wheels based on forward movement
    const rotationSpeed = this.velocity.x / 20 // Adjust for realistic wheel rotation
    this.frontWheel.rotation += rotationSpeed * deltaTime / 1000
    this.backWheel.rotation += rotationSpeed * deltaTime / 1000
  }

  private updateSnowTrail(): void {
    if (!this.snowParticles) return

    // Get the terrain height at player position for realistic snow pickup
    let terrainHeight = GameSettings.level.groundY
    if (this.levelGenerator) {
      terrainHeight = this.getTerrainHeightFromChunks(this.x)
    } else {
      terrainHeight = this.terrain.getHeightAtX(this.x)
    }

    // Position particles at ground level where snow would be picked up
    this.snowParticles.setPosition(this.x - 15, terrainHeight - 5)

    // Only emit particles when on ground and moving
    if (this.isOnGround && this.velocity.x > this.minSpeed * 0.7) {
      // Start emitting if not already
      if (!this.snowParticles.emitting) {
        this.snowParticles.start()
        console.log("Snow trail started")
      }
    } else {
      // Stop emitting when airborne or moving too slowly
      if (this.snowParticles.emitting) {
        this.snowParticles.stop()
        console.log("Snow trail stopped")
      }
    }
  }

  public startGrinding(rail: any): void {
    if (this.isGrinding) {
      return // Already grinding
    }
    
    console.log(`🔵 STARTING GRIND at rail (${rail.x.toFixed(0)}, ${rail.y.toFixed(0)})`)
    
    // Set grinding state
    this.isGrinding = true
    this.currentRail = rail
    this.grindStartTime = Date.now()
    this.grindScore = 0
    this.lastScoreUpdate = Date.now()
    
    // Handle jump-onto-rail: smooth velocity transition
    const wasAirborne = !this.isOnGround
    if (wasAirborne) {
      // Preserve horizontal momentum but dampen vertical velocity
      this.velocity.y = Math.max(this.velocity.y * 0.3, -100) // Reduce fall speed smoothly
      console.log(`🪂 SMOOTH AIR-TO-RAIL: Dampened velocity to ${this.velocity.y.toFixed(1)}`)
    }
    
    // Set ground state for rail grinding
    this.isOnGround = true
    
    // Align to rail position
    this.alignToRail()
    
    // Start visual effects
    if (this.grindParticles) {
      this.grindParticles.start()
    }
    if (this.snowParticles) {
      this.snowParticles.stop()
    }
    
    if (this.onGrindStart) {
      this.onGrindStart()
    }
    
    console.log(`🔵 GRIND STARTED: isGrinding=${this.isGrinding}, wasAirborne=${wasAirborne}`)
  }

  public stopGrinding(): void {
    if (!this.isGrinding) return // Not grinding
    
    console.log(`🔴 STOPPING GRIND: Was grinding, now stopping`)
    
    const grindTime = (Date.now() - this.grindStartTime) / 1000 // Convert to seconds
    const baseScore = Math.floor(grindTime * 200) // 200 points per second of grinding
    this.grindScore = baseScore
    
    // Clear all grinding state
    this.isGrinding = false
    this.currentRail = null
    this.lastScoreUpdate = 0
    
    // Important: Don't force isOnGround state - let physics determine this
    // this.isOnGround will be determined by ground collision detection
    
    // Stop grind particle effects
    if (this.grindParticles) {
      this.grindParticles.stop()
      console.log(`🔴 GRIND PARTICLES STOPPED`)
    }
    
    // Hide the persistent grind display
    if (this.scene && (this.scene as any).scoreManager) {
      const scoreManager = (this.scene as any).scoreManager
      scoreManager.endGrindDisplay(this.grindScore, grindTime)
      console.log(`🔴 GRIND DISPLAY HIDDEN`)
    }
    
    console.log(`🔴 GRIND COMPLETE: Time: ${grindTime.toFixed(2)}s, Score: ${this.grindScore}, isGrinding now: ${this.isGrinding}`)
    
    if (this.onGrindEnd && grindTime > 0.2) { // Only report final score if significant grinding happened
      this.onGrindEnd(grindTime, this.grindScore)
    }
  }

  public checkRailGrinding(): void {
    // This will be called from collision detection in GameScene
    // If we're not already grinding and we're on a rail, start grinding
    // If we're grinding but no longer on a rail, stop grinding
  }

  private lastScoreUpdate: number = 0

  private updateGrindTrail(): void {
    if (!this.grindParticles) return

    // Position grind particles at player position when grinding
    this.grindParticles.setPosition(this.x, this.y + 10) // Slightly below player

    // CONTINUOUS SCORING: Add points while grinding instead of waiting for stop
    if (this.isGrinding) {
      const currentTime = Date.now()
      const totalGrindTime = (currentTime - this.grindStartTime) / 1000
      
      // Award points every 0.1 seconds (100ms intervals)
      if (currentTime - this.lastScoreUpdate >= 100) {
        const pointsToAdd = 20 // 20 points per 0.1 second = 200 points per second
        this.grindScore += pointsToAdd
        this.lastScoreUpdate = currentTime
        
        // Update persistent grind display (no popup spam)
        if (this.scene && (this.scene as any).scoreManager) {
          const scoreManager = (this.scene as any).scoreManager
          scoreManager.updateGrindDisplay(this.grindScore, totalGrindTime)
          // Don't add to total score yet - that happens when grinding ends
        }
        
        // Log occasionally to show scoring is working
        if (Math.random() < 0.05) { // 5% chance to log
          console.log(`🟡 GRIND SCORING: +${pointsToAdd} pts (total: ${this.grindScore}, time: ${totalGrindTime.toFixed(1)}s)`)
        }
      }
    }
  }

  public reset(x: number, y: number): void {
    this.x = x
    this.y = y
    this.rotation = 0
    this.isOnGround = true
    this.isFlipping = false
    this.isAutoCorreting = false
    this.isInputHeld = false
    this.completedFlips = 0
    this.flipRotation = 0
    this.previousTerrainAngle = 0
    this.velocity.set(this.baseSpeed, 0) // Reset to base speed
    
    // Reset grinding state
    this.stopGrinding()
    
    // Reset physics body position
    if (this.body && this.scene.matter && (this.scene.matter as any).Matter) {
      const Matter = (this.scene.matter as any).Matter
      Matter.Body.setPosition(this.body, { x: this.x, y: this.y })
    }
    
    console.log(`Snowboarder reset to position: ${x}, ${y}`)
  }

  private alignToRail(): void {
    if (!this.currentRail) return
    
    // IMMEDIATE RAIL SNAP - No delays or complex calculations
    const railRotation = this.currentRail.rotation || 0
    const railCenterX = this.currentRail.x
    const railCenterY = this.currentRail.y
    const deltaX = this.x - railCenterX
    
    // Calculate Y position on rail surface
    if (Math.abs(railRotation) > 0.01) {
      // Angled rail - follow slope
      const slopeY = deltaX * Math.tan(railRotation)
      this.y = railCenterY + slopeY - 20
    } else {
      // Flat rail - fixed height
      this.y = railCenterY - 20
    }
    
    // Match rail rotation immediately
    this.rotation = railRotation
    
    // Reset vertical velocity to prevent bouncing
    this.velocity.y = 0
    
    // Ensure minimum forward speed
    if (this.velocity.x < this.baseSpeed) {
      this.velocity.x = this.baseSpeed
    }
    
    // Update physics body position immediately
    if (this.body && this.scene.matter && (this.scene.matter as any).Matter) {
      const Matter = (this.scene.matter as any).Matter
      Matter.Body.setPosition(this.body, { x: this.x, y: this.y + 30 }) // Proportionally larger offset
    }
    
    console.log(`🔧 RAIL SNAP: Player aligned to rail at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`)
  }

}