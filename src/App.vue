<template>
  <div class="game-container">
    <!-- 左侧：游戏区域，高度占满 -->
    <GameBoard
      :rows="ROWS"
      :cols="COLS"
      :grid="grid"
      @update:grid="grid = $event"
      @step="stepCount++"
    />

    <!-- 右侧：状态 + 控制 统一放一起 -->
    <aside class="right-sidebar">
      <div class="status-panel">
        <div class="status-item">联通区域：{{ regionCount }}</div>
        <div v-if="mode === 'PLAY'" class="status-item">步数：{{ stepCount }}</div>
      </div>
      <div class="controls">
        <div class="mode-switch">
          <label>
            <input type="radio" value="EDIT" v-model="mode" /> 编辑模式
          </label>
          <label>
            <input type="radio" value="PLAY" v-model="mode" /> 游戏模式 (点击变色)
          </label>
        </div>
        <div class="color-palette">
          <div
            v-for="color in COLORS"
            :key="color"
            :style="{ backgroundColor: color }"
            :class="['color-swatch', { active: selectedColor === color }]"
            @click="selectedColor = color"
          ></div>
        </div>
        <span v-if="mode === 'EDIT'" class="edit-tip">编辑时按住空格 + 移动鼠标可连续上色</span>
        <button @click="resetGrid">重置画布</button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, onMounted, onUnmounted } from 'vue'
import { buildGameState } from './core/calculate'
import type { Cell } from './components/Cell'
import GameBoard from './components/GameBoard.vue'
import {
  ROWS,
  COLS,
  COLORS,
  BASE_COLOR,
} from './core/constants'

// 全局状态
const mode = ref<'EDIT' | 'PLAY'>('EDIT')
const selectedColor = ref<(typeof COLORS)[number]>(COLORS[0])
const spaceHeld = ref(false) // 按住空格时，鼠标经过的格子都上色

// 通过 provide 提供全局状态
provide('gameMode', mode)
provide('selectedColor', selectedColor)
provide('spaceHeld', spaceHeld)

// 游戏状态
const stepCount = ref(0)
const grid = ref<Cell[][]>([])

// 联通区域数（仅在游戏模式下计算）
const regionCount = computed(() => {
  if (mode.value === 'EDIT') {
    return '-'
  }
  return buildGameState(grid.value).count
})

// --- 3. 初始化 ---
const initGrid = () => {
  const newGrid: Cell[][] = []
  for (let c = 0; c < COLS; c++) {
    const row: Cell[] = []
    for (let r = 0; r < ROWS; r++) {
      row.push({ r, c, color: BASE_COLOR })
    }
    newGrid.push(row)
  }
  grid.value = newGrid
  stepCount.value = 0
}

const resetGrid = () => initGrid()

const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    e.preventDefault()
    spaceHeld.value = true
  }
}
const onKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    e.preventDefault()
    spaceHeld.value = false
  }
}

onMounted(() => {
  initGrid()
  globalThis.addEventListener('keydown', onKeyDown)
  globalThis.addEventListener('keyup', onKeyUp)
})
onUnmounted(() => {
  globalThis.removeEventListener('keydown', onKeyDown)
  globalThis.removeEventListener('keyup', onKeyUp)
})
</script>

<style scoped>
.game-container {
  display: flex;
  flex-direction: row;
  font-family: sans-serif;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
}


/* 右侧：状态 + 控制，统一一列 */
.right-sidebar {
  width: 200px;
  flex-shrink: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: #f5f5f5;
  border-left: 1px solid #ddd;
  gap: 24px;
}

.status-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
}

.mode-switch {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-palette {
  display: flex;
  gap: 10px;
}

.color-swatch {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.2s;
}

.color-swatch.active {
  border-color: #333;
  transform: scale(1.1);
}


.edit-tip {
  font-size: 0.9rem;
  color: #666;
}

.status-item {
  font-size: 1rem;
  font-weight: 500;
}
</style>
