export class AudioManager {
  private scene: Phaser.Scene
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map()
  
  // Landing sound alternation
  private currentLandingSoundIndex = 0
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  preloadAudio(): void {
    // Load all game audio files
    this.scene.load.audio('crash', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/crash_sfx%202-0JdjrGAOqHzjJlH7JiXQFEvqzEjkIA.wav?YHg9')
    this.scene.load.audio('gameOver', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/Game%20Over%20Pop-GNbTaCGrT7JH00Z9oKQUSs7aAAIv7I.wav?8OEn')
    this.scene.load.audio('jump', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/jump%20sfx-4AjFQ55wcMLX3cg4NsLSgTMXpwkeji.wav?cnJ3')
    this.scene.load.audio('land1', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/land%202%20sfx-Xsnz277f0YqNUCBMgvYNKfkD2S09L6.wav?Xs5E')
    this.scene.load.audio('land2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/land%20sfx-cyUCT9eCet8XsFMRyCqEmprh743kfE.wav?T47f')
    this.scene.load.audio('railGrind', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/rail%20grind-HPHYxOpikCzCiT4UDZKf2MDIwezXWM.wav?GyY7')
    this.scene.load.audio('tokenCollect', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/752a332a-597e-4762-8de5-b4398ff8f7d4/token%20sfx-qDq1gof8EncxfoLBo7PO5ITHezOAxo.wav?HSbR')
  }

  createSounds(): void {
    // Create all sound objects with very subtle background volume (0.15)
    this.sounds.set('crash', this.scene.sound.add('crash', { volume: 0.15 }))
    this.sounds.set('gameOver', this.scene.sound.add('gameOver', { volume: 0.15 }))
    this.sounds.set('jump', this.scene.sound.add('jump', { volume: 0.15 }))
    this.sounds.set('land1', this.scene.sound.add('land1', { volume: 0.15 }))
    this.sounds.set('land2', this.scene.sound.add('land2', { volume: 0.15 }))
    this.sounds.set('railGrind', this.scene.sound.add('railGrind', { volume: 0.15, loop: true }))
    this.sounds.set('tokenCollect', this.scene.sound.add('tokenCollect', { volume: 0.15 }))
  }

  playSound(soundKey: string): void {
    const sound = this.sounds.get(soundKey)
    if (sound) {
      sound.play()
    }
  }

  playCrashSequence(): void {
    // Play crash sound immediately
    this.playSound('crash')
    
    // Play game over sound after crash sound (delay based on typical crash sound duration)
    this.scene.time.delayedCall(800, () => {
      this.playSound('gameOver')
    })
  }

  playJumpSound(): void {
    this.playSound('jump')
  }

  playRandomLandingSound(): void {
    // Alternate between the two landing sounds
    const landingSoundKey = this.currentLandingSoundIndex === 0 ? 'land1' : 'land2'
    this.playSound(landingSoundKey)
    
    // Switch to the other sound for next time
    this.currentLandingSoundIndex = 1 - this.currentLandingSoundIndex
  }

  startRailGrindSound(): void {
    const sound = this.sounds.get('railGrind')
    if (sound && !sound.isPlaying) {
      sound.play()
    }
  }

  stopRailGrindSound(): void {
    const sound = this.sounds.get('railGrind')
    if (sound && sound.isPlaying) {
      sound.stop()
    }
  }

  playTokenCollectSound(): void {
    this.playSound('tokenCollect')
  }

  destroy(): void {
    this.sounds.forEach(sound => {
      if (sound) {
        sound.destroy()
      }
    })
    this.sounds.clear()
  }
}