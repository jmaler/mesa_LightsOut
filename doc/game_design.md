# Lights Out puzzle game specifications

## Game Mechanics
- Grid sizes: 4×4, 5×5, 6×6 (player selectable)
- Light states: 2-state (off/on) or 3-state (off/dim/bright) (player selectable)
- Toggle pattern: Standard orthogonal neighbors (up/down/left/right) plus the clicked cell
- 3-state behavior: Cycles through off → dim → bright → off

## Level System
- Pre-generate 30 levels for each combination (4×4, 5×5, 6×6 × 2-state, 3-state) = 180 total levels
- Progressive difficulty within each set of 30 levels:

### 2-state optimal click ranges:
| Grid | Easy (1-10) | Medium (11-20) | Hard (21-30) |
|------|-------------|----------------|--------------|
| 4×4  | 1-3         | 3-5            | 5-7          |
| 5×5  | 3-6         | 5-8            | 8-12         |
| 6×6  | 3-8         | 7-12           | 12-18        |

### 3-state optimal click ranges:
| Grid | Easy (1-10) | Medium (11-20) | Hard (21-30) |
|------|-------------|----------------|--------------|
| 4×4  | 3-7         | 7-10           | 10-14        |
| 5×5  | 4-8         | 8-12           | 12-20        |
| 6×6  | 5-10        | 10-18          | 18-30        |

- All generated levels are verified mathematically solvable
- Note: 4×4 and 5×5 grids have non-trivial null spaces, so solver finds minimum-weight solutions

## Progression & Unlocking
- Game starts with only 4×4 available
- Player must complete at least 10 levels in 4x4 grid to unlock other grids and possibility to select 3-state game
- Players can skip levels freely (e.g., play level 1, then jump to level 15)
- Track completion status per level (not completed/1/2/3 stars)

## Scoring System
Points for completing a level:
`score = (level_number + 4) × (grid_size - 3) × (state_count == 3 ? 2 : 1) * stars`

Examples:
- 4×4 2-state level 1, 1 star: (1+4) × (4-3) × 1 × 1 = 5 points
- 4×4 3-state level 10, 2 stars: (10+4) × (4-3) × 2 × 2 = 56 points
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
- Display: "Complete 10 levels in 4×4 to unlock other grids" (if not unlocked)

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
- Implement a solver algorithm using Gaussian elimination over finite fields (GF(2) for 2-state, GF(3) for 3-state) to verify solvability and calculate optimal move count. For grids with non-trivial null spaces (4×4, 5×5), the solver searches all null space combinations to find the minimum-weight solution.
- Clean, responsive design that works on desktop and mobile
- Visual polish: smooth transitions, hover states, satisfying click feedback

## Level Generation Strategy
For each configuration:
1. Start with all lights off
2. Randomly click cells (number based on target difficulty)
3. Use this as the initial state
4. Verify solvability using the solver algorithm
5. Calculate true optimal solution length (accounting for null space)
6. If it matches target difficulty range, save; otherwise regenerate
7. Levels progress non-linearly through difficulty range with small random variations
