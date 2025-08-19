# Alto's Odyssey Style Snowboarding Game - Phaser.js + TypeScript

## Overview

An endless runner snowboarding game inspired by Alto's Odyssey, built for mobile devices with portrait orientation. Experience the thrill of carving through snowy mountain slopes with realistic physics, momentum-based jumps, and spectacular aerial tricks.

## Game Features

🏂 **Alto's Odyssey Style Gameplay**
- Endless runner snowboarding through procedurally generated terrain
- Realistic momentum-based physics system
- Smooth slope following with natural gravity and momentum

❄️ **Winter Mountain Environment**
- Beautiful snow-capped mountain backgrounds with layered depth
- Snowy terrain with varied slopes, hills, valleys, and big jumps
- Winter atmosphere with snow clouds and crisp blue skies

🎯 **Advanced Controls & Physics**
- Touch/tap to jump and perform aerial spins (360° rotations)
- Speed builds naturally downhill, momentum launches on ramps
- Auto-correction system prevents crashes from bad landings
- Enhanced uphill jump system with momentum bonuses

🎮 **Mobile-Optimized Design**
- Portrait 1:2 aspect ratio (400x800) perfect for mobile devices
- Responsive touch controls with visual feedback
- Camera follows player with optimal viewing angle

## Technical Features

- 🔧 **TypeScript** - Type-safe development with modern tooling
- 🎮 **Phaser.js** - Powerful HTML5 game framework with Matter.js physics
- 📱 **Mobile-First** - Optimized for portrait mobile gameplay
- 🔄 **Hot-Reload** - Development server with QR code for mobile testing
- 📦 **Single-File Build** - Optimized for Remix platform deployment

## What You Need Before Starting

### For Complete Beginners:
1. **Node.js** - Download from [nodejs.org](https://nodejs.org) (choose the LTS version)
   - This includes `npm` (package manager) automatically
   - On Windows: Run the installer and follow the setup wizard
   - On Mac: Download the installer or use `brew install node`
   - On Linux: Use your package manager (e.g., `sudo apt install nodejs npm`)

2. **A Code Editor** - We recommend:
   - [Visual Studio Code](https://code.visualstudio.com) (free, beginner-friendly)
   - [Cursor](https://cursor.sh) (VS Code with built-in AI assistance)

3. **Basic Terminal/Command Line Knowledge**:
   - Windows: Use Command Prompt or PowerShell
   - Mac/Linux: Use Terminal
   - You'll need to navigate to folders and run commands

## ⚠️ Important Notes

- **Phaser.js is loaded from CDN**: The game framework is loaded in `index.html`, so Phaser is globally available. **Never add Phaser imports** to your TypeScript files - this will break your game.
- **Mobile-First**: This template is designed for vertical mobile games with a 5:9 aspect ratio.
- **One-Time Setup**: The setup command can only be run once per project for safety.

## Quick Start (Step-by-Step)

### Step 1: Get the Template
```bash
# Option A: Clone with git (if you have git installed)
git clone https://github.com/InsideTheSim/remix-starter-ts-phaser my-game-name
cd my-game-name

# Option B: Download as ZIP
# Download the ZIP file from GitHub, extract it, and open Terminal/Command Prompt in that folder. 
# Downnload available at:
https://github.com/InsideTheSim/remix-starter-ts-phaser
```

### Step 2: Run Setup (IMPORTANT - Only Run Once!)
```bash
npm run remix-setup
```

**What this does:**
- Detects which package manager you're using (npm, yarn, pnpm, or bun)
- Removes the template's git history safely
- Installs all required dependencies
- Creates a fresh git repository with your first commit
- Removes the safety marker file

**⚠️ Safety Warning:** This command includes the `.is_fresh` file check and will only run on a fresh template. If the file is missing, the command will fail to prevent accidental data loss.

### Step 3: Start Development
```bash
npm run dev
```

**What happens:**
- Development server starts at `http://localhost:3000`
- A QR code appears in your terminal for mobile testing
- The browser opens automatically
- You'll see the snowboarding game with a winter mountain environment
- File changes trigger automatic browser refresh

### Step 4: Test on Your Phone
1. Make sure your phone is on the same Wi-Fi network as your computer
2. Scan the QR code that appears in your terminal
3. The game opens in your phone's browser
4. Test the touch controls and aspect ratio

<details>
<summary><strong>📦 Porting an Existing Game (Click to expand)</strong></summary>

If you have an existing game that you want to port to this starter template then follow these steps:

### Step 1: Complete the Quick Start Setup
Follow the Quick Start steps above to set up the template first.

### Step 2: Prepare Your Existing Game Code
1. Create a new folder in the project root called `src_prev` (as a sibling to the `src` folder):
   ```bash
   mkdir src_prev
   ```

2. Copy all your existing game files into the `src_prev` folder:
   ```
   your-project/
   ├── src/                    # New template structure
   ├── src_prev/           # Your existing game code
   │   ├── scenes/
   │   ├── objects/
   │   ├── assets/
   │   └── ... (all your existing files)
   └── ...
   ```

### Step 3: Ask Your LLM Assistant to Help Migrate
Once your existing code is in the `src_prev` folder, ask your AI assistant (like Claude Code) to help you migrate:

> "I have an existing Phaser.js game in the `src_prev` folder that I want to port to this Remix template. Please help me migrate the code into the proper `src` structure, ensuring it works with the 5:9 aspect ratio and Remix platform requirements. Please analyze my existing game structure and guide me through the migration process."

### ⚠️ Important Migration Reality Check:
**Things WILL break during migration!** This is completely normal and expected. Game porting is an iterative process that requires multiple rounds of fixes:

- **Expect compilation errors** - TypeScript and build issues are common
- **Expect runtime crashes** - Games may not start immediately after migration
- **Expect visual/gameplay issues** - Aspect ratio changes affect game layout
- **Be prepared for multiple LLM conversations** - You'll need to ask follow-up questions like:
  - "Fix this TypeScript error: [paste error]"
  - "The game crashes with this error: [paste error]"
  - "Help me adjust the UI layout for 5:9 aspect ratio"
  - "My touch controls aren't working, can you help?"

**Migration is a collaborative process** - Plan to spend time working with your AI assistant to resolve issues step by step. Don't expect a perfect one-shot migration.

### Migration Considerations:
- **Aspect Ratio**: Your game will need to adapt to the 5:9 mobile format
- **Asset Loading**: Assets may need to be restructured for the build process
- **Phaser Imports**: Remove any Phaser imports since it's loaded globally via CDN
- **Platform Integration**: Add Remix SDK integration for platform features
- **Mobile Optimization**: Ensure touch controls and mobile performance

### Step 4: Clean Up
After successful migration, you can remove the `src_prev` folder:
```bash
rm -rf src_prev
```

**💡 Pro Tip**: Keep your original game backup in a separate location until you're confident the migration is complete and working properly.

</details>

## Customizing Your Game

### Gameplay Instructions
**Controls:**
- **Hold Space/Tap Screen**: Jump and perform aerial spins
- **Release**: Auto-correct rotation to land safely

**Tips for High Scores:**
- Build speed by going downhill before hitting jumps
- Use momentum to launch higher off ramps and hills  
- Perform 360° spins in the air for bonus points
- Land safely to maintain your combo multiplier

### Project Structure Explained
```
your-game/
├── .is_fresh              # Safety marker (removed after setup)
├── index.html             # Main HTML file - loads Phaser and Remix SDK
├── package.json           # Project info and available commands
├── src/                   # Your game code goes here
│   ├── main.ts           # Game entry point - creates Phaser game
│   ├── config/
│   │   └── GameSettings.ts # Game settings (portrait 400x800, physics, etc.)
│   ├── objects/
│   │   └── Motorcycle.ts  # Snowboarder player character with physics
│   ├── scenes/
│   │   └── GameScene.ts   # Main game scene with winter mountain background
│   ├── systems/
│   │   ├── LevelGenerator.ts    # Infinite terrain generation
│   │   ├── InputManager.ts      # Touch/keyboard input handling
│   │   ├── ScoreManager.ts      # UI and scoring system
│   │   └── DynamicTerrain.ts    # Terrain physics and generation
│   ├── utils/
│   │   └── RemixUtils.ts  # Remix platform integration
│   └── types.ts          # TypeScript type definitions
├── scripts/               # Build and development scripts
└── dist/                 # Built game files (created when you run build)
```

### Key Files to Understand:
- **`src/main.ts`**: Creates the Phaser game with Matter.js physics engine
- **`src/scenes/GameScene.ts`**: Main game scene with winter background and systems integration
- **`src/objects/Motorcycle.ts`**: Snowboarder character with realistic physics, jumping, and spin mechanics
- **`src/systems/LevelGenerator.ts`**: Generates infinite snowy terrain with varied slopes and jumps
- **`src/systems/ScoreManager.ts`**: Handles UI, scoring, and trick combo system
- **`src/config/GameSettings.ts`**: Game settings (400x800 portrait, physics parameters, etc.)
- **`index.html`**: Loads Phaser and Remix SDK, sets up mobile-optimized container

## Available Commands

```bash
npm run remix-setup    # ⚠️ ONLY RUN ONCE - Sets up fresh project
npm run dev      # Start development server (most common)
npm run dev:3001 # Start server on port 3001 (if 3000 is busy)
npm run dev:any  # Start server on random available port
npm run build    # Build for production (creates dist/index.html)
npm run preview  # Preview the built game locally
```

## Common Development Workflow

1. **Start Development**: `npm run dev`
2. **Edit Code**: Make changes in `src/` folder
3. **See Changes**: Browser refreshes automatically
4. **Test on Mobile**: Scan QR code with phone
5. **Build for Production**: `npm run build` when ready
6. **Deploy**: Copy contents of `dist/index.html` to Remix platform

## Troubleshooting

### Common Issues:

**"Command not found: npm"**
- Install Node.js from [nodejs.org](https://nodejs.org)
- Restart your terminal after installation

**"npm run remix-setup fails"**
- Make sure you're in the correct folder (should contain `package.json`)
- Check that the `.is_fresh` file exists (if missing, you may have already run setup)

**"Port 3000 is already in use"**
- Use `npm run dev:3001` or `npm run dev:any` for different ports
- Or stop other servers using port 3000

**"Game doesn't load on mobile"**
- Ensure your phone and computer are on the same Wi-Fi network
- Try refreshing the page or scanning the QR code again
- Check that no firewall is blocking the connection

**"TypeScript errors about Phaser"**
- Never import Phaser in your TypeScript files
- Phaser is loaded globally via CDN in `index.html`
- Remove any `import Phaser from 'phaser'` lines
- You can ask your LLM to resolve this for you

### Building for Production
```bash
npm run build
```
This creates `dist/index.html` - a single file containing your entire game ready for Remix deployment.

## Deployment to Remix

1. **Build**: Run `npm run build`
2. **Copy**: Open `dist/index.html` and copy all contents
3. **Paste**: Paste into Remix platform
4. **Test**: Verify everything works on the platform
5. **Publish**: Release your game to players

## What's Included

- **Phaser**: HTML game framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Remix SDK**: Platform integration
- **Mobile optimization**: 5:9 aspect ratio with proper scaling
- **Development tools**: QR codes, hot reload, build scripts

## Getting Help:

- Copy and paste any error output to your LLM.
- Join the [Remix Discord Serve](https://discord.com/invite/a3bgdr4RC6) 

## License

MIT License - See LICENSE file for details
