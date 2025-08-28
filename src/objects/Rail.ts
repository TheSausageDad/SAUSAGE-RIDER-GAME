import GameSettings from "../config/GameSettings"
import { Poolable } from "../systems/ObjectPool"

export class Rail extends Phaser.GameObjects.Container implements Poolable {
  public body!: MatterJS.Body
  public grindSensor!: MatterJS.Body // Sensor for grinding detection
  private railGraphics!: Phaser.GameObjects.Graphics
  private width: number = 300
  private height: number = 15

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)
    
    this.createSprite()
    
    scene.add.existing(this)
    this.setupPhysics()
  }

  private createSprite(): void {
    this.railGraphics = this.scene.add.graphics()
    
    // Staircase rail colors
    const railColor = 0x888888 // Metallic gray
    const supportColor = 0x666666 // Darker gray
    
    // Create handrail sections with gaps (like staircase rails)
    const railHeight = 8
    const gapSize = 0
    const sectionSize = 25
    const totalSegmentSize = sectionSize + gapSize
    const numSections = Math.floor((this.width - gapSize) / totalSegmentSize) + 1 // Ensure we fill the width
    
    this.railGraphics.fillStyle(railColor, 1.0)
    
    // Draw rail sections with gaps, ensuring proper coverage
    for (let i = 0; i < numSections; i++) {
      const sectionX = -this.width/2 + (i * totalSegmentSize)
      // Make sure we don't exceed the rail width
      const actualSectionWidth = Math.min(sectionSize, this.width/2 - sectionX)
      
      if (actualSectionWidth > 0) {
        this.railGraphics.fillRect(sectionX, -railHeight/2, actualSectionWidth, railHeight)
        
        // Add metallic shine to each section
        this.railGraphics.fillStyle(0xAAAAAA, 0.8)
        this.railGraphics.fillRect(sectionX, -railHeight/2, actualSectionWidth, 2)
        this.railGraphics.fillStyle(railColor, 1.0)
      }
    }
    
    // Add vertical support posts evenly distributed
    const postWidth = 4
    const postHeight = 25
    const numPosts = 6 // Fewer posts for cleaner look
    
    this.railGraphics.fillStyle(supportColor, 1.0)
    for (let i = 0; i < numPosts; i++) {
      const postX = -this.width/2 + (i * this.width / (numPosts - 1)) - postWidth/2
      const postY = railHeight/2
      this.railGraphics.fillRect(postX, postY, postWidth, postHeight)
      
      // Add post caps for more realistic look
      this.railGraphics.fillStyle(0x777777, 1.0)
      this.railGraphics.fillRect(postX - 1, postY + postHeight - 2, postWidth + 2, 2)
      this.railGraphics.fillStyle(supportColor, 1.0)
    }
    
    this.add(this.railGraphics)
    
    // Add DEBUG: Green outline to show rail collision boundaries (DISABLED for clean gameplay)
    // this.createDebugOutline()
  }
  
  private createDebugOutline(): void {
    const debugGraphics = this.scene.add.graphics()
    
    // Green outline for rail collision body (solid collision area)
    debugGraphics.lineStyle(3, 0x00FF00, 1.0) // Bright green, 3px thick
    debugGraphics.strokeRect(-this.width/2, -this.height/2, this.width, this.height)
    
    // Light green fill to show the collision area
    debugGraphics.fillStyle(0x00FF00, 0.1) // 10% transparent green
    debugGraphics.fillRect(-this.width/2, -this.height/2, this.width, this.height)
    
    // Blue outline for grind sensor (above the rail) - MORE VISIBLE
    debugGraphics.lineStyle(3, 0x00FFFF, 1.0) // Bright cyan, 3px thick
    debugGraphics.strokeRect(-this.width/2 - 10, -this.height/2 - 10, this.width + 20, 20) // Grind sensor area
    
    // Light blue fill for grind sensor
    debugGraphics.fillStyle(0x00FFFF, 0.15) // 15% transparent cyan
    debugGraphics.fillRect(-this.width/2 - 10, -this.height/2 - 10, this.width + 20, 20)
    
    // Add debug text labels
    const railText = this.scene.add.text(0, -this.height/2 - 35, 'RAIL SOLID', {
      fontSize: '6px',
      color: '#00FF00',
      backgroundColor: '#000000',
      padding: { x: 2, y: 1 },
      fontFamily: '"Press Start 2P", monospace'
    })
    railText.setOrigin(0.5, 0.5)
    
    const sensorText = this.scene.add.text(0, -this.height/2 - 20, 'GRIND SENSOR', {
      fontSize: '6px',
      color: '#00FFFF',
      backgroundColor: '#000000',
      padding: { x: 2, y: 1 },
      fontFamily: '"Press Start 2P", monospace'
    })
    sensorText.setOrigin(0.5, 0.5)
    
    this.add([debugGraphics, railText, sensorText])
    
    console.log("🟢 DEBUG: Rail collision boundaries visualized with green outline")
  }

  private setupPhysics(): void {
    // Create rail collision body - make it a sensor during grinding to prevent bouncing
    this.body = this.scene.matter.add.rectangle(
      this.x, this.y, this.width, this.height,
      {
        isStatic: true,
        isSensor: true, // Make it a sensor to prevent collision during grinding
        friction: 0.02, // Low friction for smooth sliding
        frictionStatic: 0.02,
        restitution: 0.1, // Slight bounce for realistic feel
        label: 'rail',
        // Add collision filter to make it one-way
        collisionFilter: {
          category: 0x0002, // Rail category
          mask: 0x0001      // Only collides with player category
        }
      }
    ) as MatterJS.Body
    
    // Store reference for one-way collision detection
    (this.body as any).isOneWayPlatform = true
    
    // Create grinding sensor above rail for detection
    this.grindSensor = this.scene.matter.add.rectangle(
      this.x, this.y - 10, this.width + 20, 20, // Sensor above rail surface
      {
        isStatic: true,
        isSensor: true, // Sensor for grinding detection
        label: 'rail_grind_sensor'
      }
    ) as MatterJS.Body
    
    // Store reference to this rail on both bodies
    (this.body as any).gameObject = this;
    (this.grindSensor as any).gameObject = this
    
    console.log("🔧 Rail physics bodies created:")
    console.log("🔧 Rail body ID:", (this.body as any).id, "Label:", (this.body as any).label)
    console.log("🔧 Grind sensor ID:", (this.grindSensor as any).id, "Label:", (this.grindSensor as any).label)
  }

  public reset(x: number, y: number): void {
    this.x = x
    this.y = y
    
    // Reset physics body positions
    if (this.body && this.scene.matter && (this.scene.matter as any).Matter) {
      const Matter = (this.scene.matter as any).Matter
      Matter.Body.setPosition(this.body, { x, y })
    }
    if (this.grindSensor && this.scene.matter && (this.scene.matter as any).Matter) {
      const Matter = (this.scene.matter as any).Matter
      Matter.Body.setPosition(this.grindSensor, { x, y: y - 10 })
    }
  }

  public destroy(): void {
    try {
      // Properly cleanup Matter.js physics bodies
      if (this.body && this.scene.matter) {
        this.scene.matter.world.remove(this.body)
        this.body = null as any
      }
      if (this.grindSensor && this.scene.matter) {
        this.scene.matter.world.remove(this.grindSensor)
        this.grindSensor = null as any
      }
      super.destroy()
    } catch (error) {
      console.error("Rail destroy error:", error)
    }
  }
}