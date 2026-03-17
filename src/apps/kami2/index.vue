<template>
  <main class="kami2-root">
    <aside class="side-panel left-panel">
      <div class="panel-box">
        <div class="route-switch">
          <button type="button" class="mode-btn" :class="{ active: isPlayMode }" @click="goPlay">
            {{ t('kami2.modePlay') }}
          </button>
          <button type="button" class="mode-btn" :class="{ active: !isPlayMode }" @click="goSolve">
            {{ t('kami2.modeEdit') }}
          </button>
        </div>

        <div class="level-controls">
          <label class="control-label">{{ t('kami2.levelLabel') }}</label>
          <select v-model="gameStore.selectedLevelId" class="level-select">
            <option v-for="level in gameStore.kamiLevels" :key="level.id" :value="level.id">
              {{ level.name }}
            </option>
          </select>
        </div>

        <div v-if="isPlayMode" class="left-actions">
          <button type="button" @click="gameStore.loadSelectedLevelToPlay()">{{ t('kami2.loadPreset') }}</button>
          <button type="button" :disabled="!gameStore.isLevelCleared" @click="gameStore.goToNextLevel()">
            {{ t('kami2.nextLevel') }}
          </button>
          <button type="button" @click="resetGrid">{{ t('kami2.resetGrid') }}</button>
          <div class="status-item">{{ t('kami2.testSteps', { count: gameStore.stepCount }) }}</div>
          <GraphInfoPanel />
        </div>

        <div v-else class="left-actions">
          <button type="button" @click="gameStore.loadSelectedLevelToEdit()">{{ t('kami2.loadPreset') }}</button>
          <button type="button" @click="gameStore.randomizeEditGrid()">{{ t('kami2.randomGenerate') }}</button>
          <button type="button" @click="resetGrid">{{ t('kami2.resetGrid') }}</button>
          <span class="edit-tip">{{ t('kami2.editHint') }}</span>
          <GraphInfoPanel />
          <SolverPanel />
        </div>
      </div>
    </aside>

    <section class="board-stage">
      <div class="board-area" :style="boardAreaStyle">
        <GameBoard
          v-if="gameStore.gameGrid"
          :rows="gameStore.gameGrid.rows"
          :cols="gameStore.gameGrid.cols"
          :grid="gameStore.gameGrid"
          :highlight-cells="gameStore.highlightCells"
          @update:grid="gameStore.setGameGrid($event)"
          @step="gameStore.incrementStepCount()"
        />
      </div>
    </section>

    <aside class="side-panel right-panel">
      <div class="panel-box right-box">
        <ColorPalette :layout="isPlayMode ? 'vertical' : 'grid'" :show-empty="!isPlayMode" :allow-picker="!isPlayMode" />
      </div>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useGameStore } from "./stores/gameStore";
import { TRI_H } from "./core/GameGrid";
import GameBoard from "./components/GameBoard.vue";
import ColorPalette from "./components/ColorPalette.vue";
import GraphInfoPanel from "./components/GraphInfoPanel.vue";
import SolverPanel from "./components/SolverPanel.vue";

const gameStore = useGameStore();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const isPlayMode = computed(() => route.path.endsWith('/play'));

const boardAreaStyle = computed(() => {
  const g = gameStore.gameGrid;
  if (!g) return {};
  return {
    width: `${g.cols * TRI_H}px`,
    height: `${g.height}px`,
  };
});

const resetGrid = () => {
  gameStore.resetForCurrentMode();
};

const goPlay = () => {
  router.push('/kami2/play');
};

const goSolve = () => {
  router.push('/kami2/solve');
};

// 键盘事件处理
const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === "Space") {
    e.preventDefault();
    gameStore.setSpaceHeld(true);
    return;
  }

  // 数字键 1-9 选择颜色（仅在编辑模式下）
  if (gameStore.mode === "EDIT") {
    const key = e.key;
    if (key >= "1" && key <= "9") {
      const colorIndex = Number.parseInt(key, 10) - 1; // '1' -> 0, '2' -> 1, ...
      if (colorIndex >= 0 && colorIndex < gameStore.paletteColors.length) {
        e.preventDefault();
        gameStore.setSelectedColorIndex(colorIndex);
      }
    }
  }
};

const onKeyUp = (e: KeyboardEvent) => {
  if (e.code === "Space") {
    e.preventDefault();
    gameStore.setSpaceHeld(false);
  }
};

onMounted(() => {
  globalThis.addEventListener("keydown", onKeyDown);
  globalThis.addEventListener("keyup", onKeyUp);
});

watch(
  () => route.path,
  (path) => {
    if (path.endsWith('/play')) {
      gameStore.setMode('PLAY');
    } else {
      gameStore.setMode('EDIT');
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  globalThis.removeEventListener("keydown", onKeyDown);
  globalThis.removeEventListener("keyup", onKeyUp);
  gameStore.cleanup();
});
</script>

<style scoped>
.kami2-root {
  --bg-paper: #f4f7ec;
  --line: #254a61;
  --line-bold: #0f2f43;
  --text: #102233;
  --muted: #4f6270;
  --accent: #e86c1b;
  --accent-soft: #ffe6d5;
  --focus: #0f7f8c;
  --chip-bg: #edf2f5;

  height: 100vh;
  width: 100%;
  display: grid;
  grid-template-columns: 320px 1fr 240px;
  overflow: hidden;
  background:
    radial-gradient(1200px 500px at -20% -10%, #8ecdcf 0%, transparent 65%),
    radial-gradient(900px 500px at 120% 110%, #ffd1b1 0%, transparent 65%),
    linear-gradient(130deg, var(--bg-paper), #eff7ff 45%, #f5f4e8 100%);
  color: var(--text);
  font-family: 'Space Grotesk', sans-serif;
}

.kami2-root,
.kami2-root * {
  box-sizing: border-box;
}

.side-panel {
  padding: 0.9rem;
  min-height: 0;
  overflow: hidden;
}

.panel-box {
  height: 100%;
  border: 2px solid color-mix(in srgb, var(--line-bold), white 70%);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow:
    0 16px 44px rgba(7, 44, 64, 0.12),
    0 2px 10px rgba(7, 44, 64, 0.06);
  padding: 0.9rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.left-actions {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-height: 0;
  overflow: hidden;
}

.board-stage {
  min-height: 0;
  min-width: 0;
  padding: 0.9rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.board-area {
  width: min(100%, 900px);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7fbff;
  border: 2px solid color-mix(in srgb, var(--line-bold), white 70%);
  border-radius: 18px;
  overflow: hidden;
}

.right-box {
  justify-content: center;
}

.route-switch {
  display: flex;
  width: 100%;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, var(--line), white 75%);
  overflow: hidden;
}

.mode-btn {
  flex: 1;
  padding: 0.55rem 0.9rem;
  font-size: 0.95rem;
  border: none;
  background: var(--chip-bg);
  color: var(--text);
  font-weight: 700;
  cursor: pointer;
  transition: transform 120ms ease, border-color 180ms ease, background 180ms ease;
}

.mode-btn:hover:not(.active) {
  background: #dfe8ef;
}

.mode-btn.active {
  background: var(--accent-soft);
  color: var(--text);
  border-color: color-mix(in srgb, var(--accent), white 35%);
}

.level-controls {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.control-label {
  font-size: 0.85rem;
  color: var(--muted);
}

.level-select {
  width: 100%;
  padding: 0.45rem 0.65rem;
  border: 1px solid color-mix(in srgb, var(--line), white 65%);
  border-radius: 10px;
  background: #fff;
  color: var(--text);
}

.edit-tip {
  font-size: 0.82rem;
  color: var(--muted);
}

.status-item {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
}

button {
  padding: 0.55rem 1rem;
  background: linear-gradient(90deg, #daf4ff, #bde8ff);
  color: var(--text);
  border: 2px solid transparent;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.84rem;
  transition: transform 120ms ease, border-color 180ms ease, background 180ms ease;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--line), white 40%);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

button:focus-visible,
.mode-btn:focus-visible,
.level-select:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--focus), white 20%);
  outline-offset: 2px;
}

@media (max-width: 1280px) {
  .kami2-root {
    grid-template-columns: 280px 1fr 190px;
  }
}
</style>
