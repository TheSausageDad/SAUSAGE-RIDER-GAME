// Function to check if running inside the Farcade iframe environment
export function isFarcadeEnvironment(): boolean {
  try {
    // Check SDK object exists AND we are in an iframe
    return "FarcadeSDK" in window && window.top !== window.self
  } catch (e) {
    // Catch potential cross-origin errors if not in an iframe
    // This check might fail if run locally in a sandboxed iframe
    // but should be reliable in the actual Farcade environment.
    console.warn(
      "Error checking iframe status (this might be expected locally):",
      e
    )
    return false
  }
}

export function initializeFarcadeSDK(game: Phaser.Game): void {
  if (!("FarcadeSDK" in window && window.FarcadeSDK)) {
    console.warn("Farcade SDK not found.")
    return
  }

  // Make the game canvas focusable
  game.canvas.setAttribute("tabindex", "-1")

  // Signal ready state
  window.FarcadeSDK.singlePlayer.actions.ready()

  // Set mute/unmute handler
  window.FarcadeSDK.on("toggle_mute", (data: { isMuted: boolean }) => {
    game.sound.mute = data.isMuted
  })

  // Setup play_again handler
  window.FarcadeSDK.on("play_again", () => {
    // Always restart directly to GameScene (skip menu)
    const gameScene = game.scene.getScene("GameScene") as any
    if (gameScene) {
      // If GameScene exists, restart it directly
      if (gameScene.scene.isActive("GameScene")) {
        // Game is active, restart it in place
        gameScene.restartGame()
      } else {
        // Game is not active, start GameScene
        game.scene.start("GameScene")
      }
    } else {
      // Fallback: start GameScene
      game.scene.start("GameScene")
    }

    // Attempt to bring focus back to the game canvas
    try {
      game.canvas.focus()
    } catch (e) {
      console.warn("Could not programmatically focus game canvas:", e)
    }
  })
}

// Helper function to trigger haptic feedback
export function triggerHapticFeedback(): void {
  if ("FarcadeSDK" in window && window.FarcadeSDK) {
    window.FarcadeSDK.singlePlayer.actions.hapticFeedback()
  }
}

// Helper function to trigger game over with score
export function triggerGameOver(score: number): void {
  if ("FarcadeSDK" in window && window.FarcadeSDK) {
    window.FarcadeSDK.singlePlayer.actions.gameOver({ score })
  }
}
