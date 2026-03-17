<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import SudokuBoard from './components/SudokuBoard.vue'
import SudokuNumpad from './components/SudokuNumpad.vue'
import { useSudokuGame } from './composables/useSudokuGame'
import type { Difficulty } from './types/sudoku'

const levels: Difficulty[] = ['easy', 'medium', 'hard']

const game = useSudokuGame()
const {
  applyValue,
  cancelSolve,
  cellViewModels,
  clearSelected,
  difficulty,
  dispose,
  filteredPresets,
  filledCells,
  formatTime,
  initGame,
  isEditSolveMode,
  isSolving,
  mistakes,
  mode,
  loadSelectedPreset,
  newGame,
  onKeyDown,
  selectCell,
  selectedPresetId,
  setMode,
  setSelectedPreset,
  setDifficulty,
  solveBoard,
  startManualEditBoard,
  startRandomEditBoard,
  statusMessage,
} = game

onMounted(() => {
  initGame()
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  dispose()
})
</script>

<template>
  <main class="sudoku-page page-shell">
    <div class="ambient-shape shape-a" />
    <div class="ambient-shape shape-b" />

    <section class="game-card">
      <header class="header">
        <p class="eyebrow">Vue 3 + TypeScript</p>
        <h1>Sudoku Atelier</h1>
        <p class="status">{{ statusMessage }}</p>
      </header>

      <section class="toolbar">
        <div class="mode-group" role="group" aria-label="Mode">
          <button class="chip" :class="{ active: mode === 'game' }" @click="setMode('game')">
            Game
          </button>
          <button
            class="chip"
            :class="{ active: mode === 'edit-solve' }"
            @click="setMode('edit-solve')"
          >
            Edit + Solve
          </button>
        </div>

        <div class="difficulty-group" role="group" aria-label="Difficulty">
          <button
            v-for="level in levels"
            :key="level"
            class="chip"
            :class="{ active: difficulty === level }"
            :disabled="isSolving"
            @click="setDifficulty(level)"
          >
            {{ level }}
          </button>
        </div>

        <div class="toolbar-actions">
          <button class="new-game" @click="newGame">Reset</button>
          <button class="solve-button" :disabled="isSolving" @click="solveBoard">
            {{ isSolving ? 'Solving...' : 'Solve' }}
          </button>
          <button class="cancel-button" :disabled="!isSolving" @click="() => cancelSolve()">
            Cancel
          </button>
        </div>
      </section>

      <section v-if="isEditSolveMode" class="editor-panel">
        <select
          class="level-select"
          :value="selectedPresetId"
          @change="setSelectedPreset(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="preset in filteredPresets" :key="preset.id" :value="preset.id">
            {{ preset.name }}
          </option>
        </select>
        <div class="editor-actions">
          <button class="chip" @click="loadSelectedPreset">Load Preset</button>
          <button class="chip" @click="startRandomEditBoard">Random</button>
          <button class="chip" @click="startManualEditBoard">Manual</button>
        </div>
      </section>

      <section class="metrics" aria-live="polite">
        <div>
          <span>Time</span>
          <strong>{{ formatTime }}</strong>
        </div>
        <div>
          <span>Mistakes</span>
          <strong>{{ mistakes }}</strong>
        </div>
        <div>
          <span>Progress</span>
          <strong>{{ filledCells }}/81</strong>
        </div>
      </section>

      <SudokuBoard :cells="cellViewModels" @select="selectCell" />

      <SudokuNumpad :disabled="isSolving" @digit="applyValue" @erase="clearSelected" />
    </section>
  </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Space+Grotesk:wght@400;500;700&display=swap');

.sudoku-page {
  --bg-ink: #142029;
  --bg-paper: #f4f7ec;
  --card: rgba(255, 255, 255, 0.88);
  --line: #254a61;
  --line-bold: #0f2f43;
  --text: #102233;
  --muted: #4f6270;
  --accent: #e86c1b;
  --accent-soft: #ffe6d5;
  --focus: #0f7f8c;
}

.sudoku-page,
.sudoku-page * {
  box-sizing: border-box;
}

.sudoku-page {
  position: relative;
  min-height: 100%;
  padding: 2rem 1rem 2.5rem;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: var(--text);
  font-family: 'Space Grotesk', sans-serif;
  background:
    radial-gradient(1200px 500px at -20% -10%, #8ecdcf 0%, transparent 65%),
    radial-gradient(900px 500px at 120% 110%, #ffd1b1 0%, transparent 65%),
    linear-gradient(130deg, var(--bg-paper), #eff7ff 45%, #f5f4e8 100%);
}

.sudoku-page button {
  font: inherit;
}

.sudoku-page .ambient-shape {
  position: absolute;
  border-radius: 999px;
  filter: blur(40px);
  opacity: 0.35;
  pointer-events: none;
}

.sudoku-page .shape-a {
  width: 380px;
  height: 380px;
  background: #59b3b8;
  top: -140px;
  left: -120px;
  animation: floaty 14s ease-in-out infinite;
}

.sudoku-page .shape-b {
  width: 300px;
  height: 300px;
  background: #f4a675;
  bottom: -120px;
  right: -80px;
  animation: floaty 11s ease-in-out infinite reverse;
}

.sudoku-page .game-card {
  width: min(94vw, 760px);
  padding: 1.25rem;
  border: 2px solid color-mix(in srgb, var(--line-bold), white 70%);
  background: var(--card);
  border-radius: 22px;
  box-shadow:
    0 16px 44px rgba(7, 44, 64, 0.15),
    0 2px 10px rgba(7, 44, 64, 0.08);
  backdrop-filter: blur(6px);
  animation: reveal 500ms ease;
}

.sudoku-page .header {
  text-align: center;
  margin-bottom: 1rem;
}

.sudoku-page .eyebrow {
  margin: 0;
  color: var(--muted);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  font-size: 0.75rem;
}

.sudoku-page h1 {
  margin: 0.35rem 0;
  font-family: 'Fraunces', serif;
  font-size: clamp(1.9rem, 4vw, 2.7rem);
  line-height: 1;
}

.sudoku-page .status {
  margin: 0;
  color: var(--muted);
  font-size: 0.95rem;
}

.sudoku-page .toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.sudoku-page .difficulty-group {
  display: flex;
  gap: 0.45rem;
}

.sudoku-page .mode-group {
  display: flex;
  gap: 0.45rem;
}

.sudoku-page .toolbar-actions {
  display: flex;
  gap: 0.45rem;
}

.sudoku-page .editor-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.85rem;
}

.sudoku-page .level-select {
  flex: 1;
  min-width: 220px;
  border: 1px solid color-mix(in srgb, var(--line), white 65%);
  border-radius: 10px;
  background: #fff;
  padding: 0.5rem 0.7rem;
  color: var(--text);
}

.sudoku-page .editor-actions {
  display: flex;
  gap: 0.45rem;
}

.sudoku-page .chip,
.sudoku-page .new-game,
.sudoku-page .solve-button,
.sudoku-page .cancel-button,
.sudoku-page .numpad button {
  border: 2px solid transparent;
  border-radius: 999px;
  background: #edf2f5;
  color: var(--text);
  font-weight: 700;
  transition: transform 120ms ease, border-color 180ms ease, background 180ms ease;
}

.sudoku-page .chip {
  text-transform: capitalize;
  padding: 0.45rem 0.9rem;
}

.sudoku-page .chip.active {
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent), white 35%);
}

.sudoku-page .new-game {
  padding: 0.55rem 1rem;
  background: linear-gradient(90deg, #ffe5d4, #ffc9a3);
}

.sudoku-page .solve-button,
.sudoku-page .cancel-button {
  padding: 0.55rem 1rem;
}

.sudoku-page .solve-button {
  background: linear-gradient(90deg, #daf4ff, #bde8ff);
}

.sudoku-page .cancel-button {
  background: #f8ece8;
}

.sudoku-page .metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.sudoku-page .metrics div {
  border: 1px solid color-mix(in srgb, var(--line), white 80%);
  border-radius: 12px;
  padding: 0.55rem 0.7rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: #fcfdfb;
}

.sudoku-page .metrics span {
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.sudoku-page .metrics strong {
  font-size: 1.05rem;
}

.sudoku-page .board-wrap {
  display: grid;
  place-items: center;
}

.sudoku-page .sudoku-grid {
  width: min(88vw, 520px);
  aspect-ratio: 1;
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  border: 3px solid var(--line-bold);
  border-radius: 16px;
  overflow: hidden;
  background: #f6fbff;
}

.sudoku-page .cell {
  border: 1px solid color-mix(in srgb, var(--line), white 55%);
  background: #fdfefe;
  color: var(--text);
  font-size: clamp(1.1rem, 2.4vw, 1.55rem);
  font-weight: 600;
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
  transition: background 140ms ease, color 140ms ease;
}

.sudoku-page .cell:nth-child(3n):not(:nth-child(9n)) {
  border-right: 2px solid var(--line-bold);
}

.sudoku-page .cell:nth-child(n + 19):nth-child(-n + 27),
.sudoku-page .cell:nth-child(n + 46):nth-child(-n + 54) {
  border-bottom: 2px solid var(--line-bold);
}

.sudoku-page .cell.given {
  font-weight: 800;
  color: #0e3a50;
  background: #f1f8fd;
}

.sudoku-page .cell.related {
  background: #eef5f9;
}

.sudoku-page .cell.matching {
  background: #e6f0ff;
}

.sudoku-page .cell.selected {
  background: #d7f0f1;
  color: #0a3448;
}

.sudoku-page .cell.conflict {
  background: #ffe3e0;
}

.sudoku-page .cell.wrong:not(.given) {
  color: #b23a2f;
}

.sudoku-page .cell:focus-visible,
.sudoku-page .chip:focus-visible,
.sudoku-page .new-game:focus-visible,
.sudoku-page .solve-button:focus-visible,
.sudoku-page .cancel-button:focus-visible,
.sudoku-page .numpad button:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--focus), white 20%);
  outline-offset: 2px;
}

.sudoku-page .numpad {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
  margin-top: 1rem;
}

.sudoku-page .numpad button {
  min-height: 2.65rem;
  background: #f4f7f8;
}

.sudoku-page .numpad .erase {
  grid-column: span 2;
  background: #fff0e4;
}

.sudoku-page .chip:hover,
.sudoku-page .new-game:hover,
.sudoku-page .solve-button:hover,
.sudoku-page .cancel-button:hover,
.sudoku-page .numpad button:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--line), white 40%);
}

.sudoku-page .chip:disabled,
.sudoku-page .new-game:disabled,
.sudoku-page .solve-button:disabled,
.sudoku-page .cancel-button:disabled,
.sudoku-page .numpad button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

@keyframes reveal {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes floaty {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(18px);
  }
}

@media (max-width: 720px) {
  .sudoku-page .game-card {
    padding: 0.95rem;
    border-radius: 18px;
  }

  .sudoku-page .toolbar {
    flex-wrap: wrap;
  }

  .sudoku-page .difficulty-group {
    width: 100%;
    justify-content: center;
  }

  .sudoku-page .mode-group {
    width: 100%;
    justify-content: center;
  }

  .sudoku-page .toolbar-actions {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .sudoku-page .new-game,
  .sudoku-page .solve-button,
  .sudoku-page .cancel-button {
    width: 100%;
  }

  .sudoku-page .metrics {
    gap: 0.45rem;
  }

  .sudoku-page .numpad {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
</style>
