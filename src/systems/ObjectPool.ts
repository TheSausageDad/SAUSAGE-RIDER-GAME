import { Token } from "../objects/Token"
import { Spike } from "../objects/Spike"
import { MovingPlatform } from "../objects/MovingPlatform"
import { Rail } from "../objects/Rail"

export interface Poolable {
  reset(x: number, y: number, ...args: any[]): void
  setActive(active: boolean): this
  setVisible(visible: boolean): this
  body?: MatterJS.Body
}

export class ObjectPool<T extends Poolable> {
  private pool: T[] = []
  private activeObjects: Set<T> = new Set()
  private createFn: (scene: Phaser.Scene, x: number, y: number, ...args: any[]) => T

  constructor(
    private scene: Phaser.Scene,
    createFunction: (scene: Phaser.Scene, x: number, y: number, ...args: any[]) => T,
    initialSize: number = 10
  ) {
    this.createFn = createFunction
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      const obj = this.createFn(this.scene, -1000, -1000) // Create off-screen
      obj.setActive(false).setVisible(false)
      this.pool.push(obj)
    }
  }

  public get(x: number, y: number, ...args: any[]): T {
    let obj: T

    if (this.pool.length > 0) {
      // Reuse from pool
      obj = this.pool.pop()!
      obj.reset(x, y, ...args)
      obj.setActive(true).setVisible(true)
    } else {
      // Create new if pool is empty
      obj = this.createFn(this.scene, x, y, ...args)
    }

    this.activeObjects.add(obj)
    return obj
  }

  public release(obj: T): void {
    if (this.activeObjects.has(obj)) {
      this.activeObjects.delete(obj)
      obj.setActive(false).setVisible(false)
      
      // Move off-screen to avoid visual artifacts
      if (obj.body && this.scene.matter && (this.scene.matter as any).Matter) {
        const Matter = (this.scene.matter as any).Matter
        Matter.Body.setPosition(obj.body, { x: -1000, y: -1000 })
      }
      
      this.pool.push(obj)
    }
  }

  public releaseAll(): void {
    this.activeObjects.forEach(obj => {
      obj.setActive(false).setVisible(false)
      if (obj.body && this.scene.matter && (this.scene.matter as any).Matter) {
        const Matter = (this.scene.matter as any).Matter
        Matter.Body.setPosition(obj.body, { x: -1000, y: -1000 })
      }
      this.pool.push(obj)
    })
    this.activeObjects.clear()
  }

  public getActiveCount(): number {
    return this.activeObjects.size
  }

  public getPoolSize(): number {
    return this.pool.length
  }
}

export class GameObjectPools {
  public tokenPool: ObjectPool<Token>
  public spikePool: ObjectPool<Spike>
  public platformPool: ObjectPool<MovingPlatform>
  public railPool: ObjectPool<Rail>

  constructor(scene: Phaser.Scene) {
    this.tokenPool = new ObjectPool(scene, (s, x, y) => new Token(s, x, y), 20)
    this.spikePool = new ObjectPool(scene, (s, x, y) => new Spike(s, x, y), 10)
    this.platformPool = new ObjectPool(scene, (s, x, y, w, h, sx, sy, ex, ey) => 
      new MovingPlatform(s, x, y, w, h, sx, sy, ex, ey), 5)
    this.railPool = new ObjectPool(scene, (s, x, y) => new Rail(s, x, y), 3)
  }

  public releaseAll(): void {
    this.tokenPool.releaseAll()
    this.spikePool.releaseAll()
    this.platformPool.releaseAll()
    this.railPool.releaseAll()
  }

  public getStats(): { [key: string]: { active: number, pooled: number } } {
    return {
      tokens: { active: this.tokenPool.getActiveCount(), pooled: this.tokenPool.getPoolSize() },
      spikes: { active: this.spikePool.getActiveCount(), pooled: this.spikePool.getPoolSize() },
      platforms: { active: this.platformPool.getActiveCount(), pooled: this.platformPool.getPoolSize() },
      rails: { active: this.railPool.getActiveCount(), pooled: this.railPool.getPoolSize() }
    }
  }
}