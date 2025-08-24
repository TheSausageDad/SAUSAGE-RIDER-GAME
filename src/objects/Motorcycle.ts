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
  
  // Crash detection
  public onCrash: (() => void) | null = null
  
  // Continuous flip controls
  private isInputHeld: boolean = false
  private flipSpeed: number = 360 // degrees per second when flipping (reduced for slower rotation)
  private autoCorrectSpeed: number = 360 // degrees per second for auto-correction
  private isAutoCorreting: boolean = false
  
  // Momentum-based launching
  private previousTerrainAngle: number = 0
  private launchThreshold: number = -0.5 // Minimum upward angle to trigger launch (radians)
  private momentumMultiplier: number = 0.6 // How much speed converts to launch power
  
  public onFlipComplete: ((flips: number) => void) | null = null
  public onLanding: (() => void) | null = null
  public onTrickComplete: ((tricks: string[], multiplier: number, airTime: number) => void) | null = null

  constructor(scene: Phaser.Scene, x: number, y: number, terrain: DynamicTerrain, levelGenerator?: LevelGenerator) {
    super(scene, x, y)
    
    this.terrain = terrain
    this.levelGenerator = levelGenerator!
    
    // Add to scene first so container position is set
    scene.add.existing(this)
    
    // Set depth to ensure motorcycle is visible above other objects
    this.setDepth(100)
    
    this.createSprites()
    this.setupPhysics()
    
    // Position motorcycle on ground initially
    this.positionOnGround()
  }

  private createSprites(): void {
    console.log(`Creating sausage character at position: ${this.x}, ${this.y}`)
    
    // Use the sausage character image
    this.riderSprite = this.scene.add.image(-10, 80, 'player') as any
    this.riderSprite.setScale(0.18) // Increased scale for bigger normal image
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
    // Create a sensor physics body for collision detection only (doesn't affect movement)
    this.body = this.scene.matter.add.circle(
      this.x, this.y, 20,
      {
        isSensor: true, // Doesn't collide physically, just detects overlaps
        label: 'player',
        isStatic: false // Allow manual position updates
      }
    )
    
    // Store reference to this motorcycle on the body for collision detection
    this.body.gameObject = this
    
    // DO NOT link with matter.add.gameObject - we want to keep custom physics
    console.log("Motorcycle collision body created (no physics control)")
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
      
      this.y = terrainHeight - 20 // Position on terrain (matching collision detection)
      this.isOnGround = true // Make sure we start on ground
      this.velocity.y = 0 // No initial vertical velocity
      console.log(`Snowboarder positioned on ground at: ${this.x}, ${this.y}, terrain height: ${terrainHeight}`)
    })
  }

  public handleInput(isPressed: boolean): void {
    const wasInputHeld = this.isInputHeld
    this.isInputHeld = isPressed
    
    // Handle initial press for jumping
    if (isPressed && !wasInputHeld && this.isOnGround) {
      // First press while on ground = jump
      this.jump()
      return
    }
    
    // Handle continuous flipping only when truly airborne
    if (this.isTrulyAirborne()) {
      if (isPressed) {
        if (!this.isFlipping) {
          // Start flipping - change to flipping image and adjust position/scale
          (this.riderSprite as any).setTexture('player_flipping');
          this.riderSprite.setPosition(0, 60); // Move down closer to ground
          this.riderSprite.setScale(0.2); // Slightly larger scale for flipping image
        }
        this.isFlipping = true
        this.isAutoCorreting = false
      } else {
        if (this.isFlipping) {
          // Stop flipping - change back to normal image and restore position/scale
          (this.riderSprite as any).setTexture('player');
          this.riderSprite.setPosition(-10, 80); // Restore original position
          this.riderSprite.setScale(0.18); // Restore original scale
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
        this.riderSprite.setPosition(-10, 80); // Restore original position
        this.riderSprite.setScale(0.18); // Restore original scale
      }
      this.isFlipping = false
      this.isAutoCorreting = false
    }
  }

  public jump(): void {
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
    
    const snowboarderBottom = this.y + 20 // Account for snowboarder height from center
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
    
    const motorcycleBottom = this.y + 20 // Account for motorcycle height from center
    let jumpThreshold = 40 // Increased base jump threshold for stability
    
    // Make jumping much more forgiving with high speed
    if (this.velocity.x > this.baseSpeed * 1.2) {
      // High speed = more forgiving jump
      jumpThreshold = 60
    }
    
    // Get terrain angle to detect slopes
    const terrainAngle = this.levelGenerator ? 
      this.getTerrainAngleFromChunks(this.x) : 
      this.terrain.getSlopeAngleAtX(this.x)
    
    // Make jumping extra forgiving on ANY slope (uphill or downhill)
    const slopeStrength = Math.abs(terrainAngle)
    if (slopeStrength > 0.1) { // Any significant slope
      jumpThreshold = 80 // Extra forgiving on all slopes
      
      // Even more forgiving on steep slopes
      if (slopeStrength > 0.3) {
        jumpThreshold = 100 // Very forgiving on steep slopes
      }
    }
    
    // Special case: if going uphill with good speed, be extra lenient
    if (terrainAngle < -0.2 && this.velocity.x > this.baseSpeed * 1.3) {
      jumpThreshold = 120 // Super forgiving for uphill momentum jumps
    }
    
    return motorcycleBottom >= (terrainHeight - jumpThreshold)
  }

  private checkForCrash(): boolean {
    // Check if snowboarder is landing head-first (much more forgiving)
    const normalizedRotation = ((this.rotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2)
    
    // Only crash if landing nearly upside down (head touching ground)
    // Safe zone: everything except the narrow "head-first" range around 180 degrees (π)
    const headFirstRange = Math.PI / 3 // 60 degrees range around upside down (±30°)
    const upsideDown = Math.PI // 180 degrees
    
    // Check if we're in the dangerous head-first landing zone
    const distanceFromUpsideDown = Math.min(
      Math.abs(normalizedRotation - upsideDown),
      Math.abs(normalizedRotation - (upsideDown + Math.PI * 2)),
      Math.abs(normalizedRotation - (upsideDown - Math.PI * 2))
    )
    
    // Only crash if landing very close to upside down (head-first)
    if (distanceFromUpsideDown < headFirstRange / 2) {
      // Head is touching ground - crash!
      return true
    }
    
    return false // Safe landing - can land on side, back, etc.
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

    // Alto's Odyssey style movement
    this.updateVelocityBasedOnTerrain(dt)
    
    // Apply movement
    this.x += this.velocity.x * dt
    this.y += this.velocity.y * dt
    
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
    
    // Update physics body position to match visual position
    this.scene.matter.body.setPosition(this.body, { x: this.x, y: this.y })
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
      this.velocity.x += speedDiff * responsiveAcceleration
      
      // Keep vertical velocity aligned with terrain when on ground only for slopes
      if (Math.abs(terrainAngle) > 0.01) { // Only adjust for actual slopes
        this.velocity.y = this.velocity.x * Math.tan(terrainAngle)
      } else {
        this.velocity.y = 0 // No vertical movement on flat ground
      }
    }
  }

  private checkGroundCollision(dt: number): void {
    let terrainHeight = GameSettings.level.groundY
    
    // Get terrain height from LevelGenerator if available
    if (this.levelGenerator) {
      terrainHeight = this.getTerrainHeightFromChunks(this.x)
    } else {
      // Fallback to DynamicTerrain
      terrainHeight = this.terrain.getHeightAtX(this.x)
    }
    
    const motorcycleBottom = this.y + 20 // Account for motorcycle height from center
    const targetY = terrainHeight - 20 // Where we want to be
    
    // Check for terrain drop - if terrain is significantly below current position, let motorcycle fall naturally
    const terrainDropThreshold = 50 // pixels - adjust this to control sensitivity
    const isTerrainDrop = this.isOnGround && (terrainHeight > this.y + terrainDropThreshold)
    
    if (motorcycleBottom >= terrainHeight && !isTerrainDrop) {
      // Increase stability counter when we should be on ground
      this.groundCheckStability = Math.min(this.groundCheckStability + 1, 10)
      
      // Landing logic - no slow interpolation
      if (!this.isOnGround) {
        // Landing from air - snap to terrain immediately
        this.y = targetY
      } else {
        // Already on ground - follow terrain naturally without interpolation
        this.y = targetY
      }
      
      if (!this.isOnGround) {
        // Just landed from being in air - check for crash
        if (this.checkForCrash()) {
          // Crashed! Game over
          console.log("Snowboarder crashed on landing!")
          if (this.onCrash) {
            this.onCrash()
          }
          return // Don't process normal landing
        }
        
        this.isOnGround = true
        
        // Absorb some vertical velocity on landing, keep horizontal momentum
        this.velocity.y *= 0.1 // Dampen vertical bounce
        
        // Reset all flip states
        this.isFlipping = false;
        this.isAutoCorreting = false;
        this.flipRotation = 0;
        
        // Change back to normal image when landing and restore position/scale
        (this.riderSprite as any).setTexture('player');
        this.riderSprite.setPosition(-10, 80); // Restore original position
        this.riderSprite.setScale(0.18); // Restore original scale
        
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
    
    // Reset physics body position
    if (this.body) {
      this.scene.matter.body.setPosition(this.body, { x: this.x, y: this.y })
    }
    
    console.log(`Snowboarder reset to position: ${x}, ${y}`)
  }
}