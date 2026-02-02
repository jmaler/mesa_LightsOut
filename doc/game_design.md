# Lights Out puzzle game specifications

## Game Mechanics
- Grid sizes: 4×4, 5×5, 6×6 (player selectable)
- Light states: 2-state (off/on) or 3-state (off/dim/bright) (player selectable)
- Toggle pattern: Standard orthogonal neighbors (up/down/left/right) plus the clicked cell
- 3-state behavior: Cycles through off → dim → bright → off

## Level System
- Pre-generate 30 levels for each combination (5×5 2-state, 5×5 3-state, 6×6 2-state, etc.) = 180 total levels
- Progressive difficulty within each set of 30 levels:
  - Levels 1-10: Easy (1-6 clicks in 4x4, 3-8 in 5x5 and 3-10 in 6x6)
  - Levels 11-20: Medium (6-12 optimal clicks in 4x4, 8-14 in 5x5 and 10-16 in 6x6)
  - Levels 21-30: Hard (12-20 optimal clicks in 4x4, 14-25 in 5x5 and 16-30 in 6x6)
- For 4x4 and 6×6 grids, ensure all generated levels are mathematically solvable

## Progression & Unlocking
- Game starts with only 4×4 available
- Player must complete at least 10 levels in 4x4 grid to unlock other grids and possibility to select 3-state game
- Players can skip levels freely (e.g., play level 1, then jump to level 15)
- Track completion status per level (not completed/1/2/3 stars)

## Scoring System
Points for completing a level:
`score = (level_number + 4) × (grid_size - 3) × (state_count == 3 ? 3 : 1) * stars`

Examples:
- 4×4 2-state level 1, 1 star: (1+4) × (4-3) × 1 × 1 = 5 points
- 4×4 3-state level 10, 2 stars: (10+4) × (4-3) × 3 × 2 = 84 points
- 6×6 2-state level 30, 3 stars: (30+4) × (6-3) × 1 × 3 = 306 points

Total score = sum of all completed level scores

## Screen Design Proposals

### 1. Main Menu Screen
- Game title "Lights Out"
- Buttons:
  - "Play" → goes to Level Select
  - "How to Play" → shows Tutorial overlay
- Display current total score prominently

### 2. Level Select Screen
- Tabs for grid size: 4×4, 5×5 (locked), 6×6 (locked)
- Toggle for state count: 2-state / 3-state
- Grid of 30 level buttons (5 rows × 6 columns)
  - Each button shows:
    - Level number
    - Completion status (✓ if completed)
    - Point value for that level
  - Visual indication of difficulty (color coding: green=easy, yellow=medium, red=hard)
- "Back" button to Main Menu
- Display: "Complete 10 levels in 5×5 to unlock larger grids" (if not unlocked)

### 3. Game Screen
- Center: The grid of lights (cells that can be clicked)
  - 2-state: off (dark gray/black) / on (bright yellow/white)
  - 3-state: off (dark gray) / dim (light gray) / bright (bright yellow)
  - Visual feedback on click (brief animation/highlight)
- Top bar:
  - Current level indicator (e.g., "5×5 3-State - Level 12")
  - Move counter (tracks number of clicks)
  - Optimal solution indicator (e.g., "Best: 15 moves")
- Bottom bar:
  - "Reset" button (restart current level)
  - "Back to Levels" button
  - "Next Level" button (appears after completion)
- Victory popup when solved:
  - "Level Complete!"
  - Moves taken vs optimal
  - Points earned
  - Buttons: "Next Level" / "Back to Levels"

### 4. Tutorial/How to Play Screen
- Simple explanation with visual example, working on both portrait mobile and desktop
  - "Click a light to toggle it and its neighbors"
  - Explanation of 2-state vs 3-state only if already unlocked
  - Goal: "Turn all lights off"
- "Got it" button → returns to Main Menu

## Other Requirements
- Leaderboard will use PlayMesa SDK available in /sdk folder, score will be stored there
- Store progress using PlayMesa SDK  available in /sdk folder (completed levels, unlock status)
- Implement a solver algorithm to verify levels are solvable and calculate optimal move count
- Clean, responsive design that works on desktop and mobile
- Visual polish: smooth transitions, hover states, satisfying click feedback

## Level Generation Strategy
For each configuration:
1. Start with all lights off
2. Randomly click suitable amount of cells (based on difficulty)
3. Use this as the initial state
4. Verify solvability using a solver algorithm
5. Calculate optimal solution length
6. If it matches target difficulty, save; otherwise regenerate
7. For 6×6, explicitly check solvability before accepting
