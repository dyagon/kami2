<template>
  <div class="board-wrapper">
    <svg
      class="game-svg"
      :viewBox="`0 0 ${boardWidth} ${boardHeight}`"
      preserveAspectRatio="xMidYMid meet"
    >
      <g v-for="(col, c) in props.grid" :key="c">
        <polygon
          v-for="(cell, r) in col"
          :key="`${c}-${r}`"
          :points="getTrianglePoints(c, r)"
          :fill="cell.color"
          stroke="#fff"
          stroke-width="1"
          class="triangle-cell"
          @click="handleCellClick(c, r)"
          @mouseenter="handleCellEnter(c, r)"
        />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { getTrianglePoints, getNeighbors } from '../core/draw'
import type { Cell } from './Cell'
import { TRI_H, SIDE_A } from '../core/constants'

interface Props {
  rows: number
  cols: number
  grid: Cell[][]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:grid': [grid: Cell[][]]
  step: []
}>()

// 注入全局状态
const mode = inject<ReturnType<typeof ref<'EDIT' | 'PLAY'>>>('gameMode')
const selectedColor = inject<ReturnType<typeof ref<string>>>('selectedColor')
const spaceHeld = inject<ReturnType<typeof ref<boolean>>>('spaceHeld')

if (!mode || !selectedColor || !spaceHeld) {
  throw new Error('GameBoard: 缺少必需的全局状态')
}

// 类型断言，确保值存在
const modeValue = mode as ReturnType<typeof ref<'EDIT' | 'PLAY'>>
const selectedColorValue = selectedColor as ReturnType<typeof ref<string>>
const spaceHeldValue = spaceHeld as ReturnType<typeof ref<boolean>>

// 计算画布尺寸
const boardWidth = computed(() => props.cols * TRI_H)
const boardHeight = computed(() => 14 * SIDE_A)

// 创建 grid 的本地副本用于修改
const localGrid = computed(() => props.grid)

const paintCell = (c: number, r: number) => {
  const newGrid = localGrid.value.map(col => col.map(cell => ({ ...cell })))
  newGrid[c][r].color = selectedColorValue.value!
  emit('update:grid', newGrid)
}

const handleCellEnter = (c: number, r: number) => {
  if (modeValue.value === 'EDIT' && spaceHeldValue.value) {
    paintCell(c, r)
  }
}

const floodFill = (
  startC: number,
  startR: number,
  oldColor: string,
  newColor: string
) => {
  const newGrid = localGrid.value.map(col => col.map(cell => ({ ...cell })))
  const queue = [{ r: startR, c: startC }]
  const visited = new Set<string>()

  newGrid[startC][startR].color = newColor
  visited.add(`${startR},${startC}`)

  while (queue.length > 0) {
    const curr = queue.shift()!
    const neighbors = getNeighbors(curr.r, curr.c)

    for (const n of neighbors) {
      const nKey = `${n.r},${n.c}`
      if (visited.has(nKey)) continue

      // 边界检查：确保坐标在有效范围内
      if (n.c < 0 || n.c >= props.cols || n.r < 0 || n.r >= props.rows) continue
      if (!newGrid[n.c] || !newGrid[n.c][n.r]) continue

      const cell = newGrid[n.c][n.r]
      if (cell.color === oldColor) {
        cell.color = newColor
        visited.add(nKey)
        queue.push(n)
      }
    }
  }
  
  emit('update:grid', newGrid)
}

const handleCellClick = (c: number, r: number) => {
  const cell = localGrid.value[c][r]
  if (!cell) return
  
  const targetColor = cell.color
  const newColor = selectedColorValue.value!

  if (modeValue.value === 'EDIT') {
    paintCell(c, r)
  } else {
    if (targetColor === newColor) return
    floodFill(c, r, targetColor, newColor)
    emit('step')
  }
}
</script>

<style scoped>
.board-wrapper {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #e8e8e8;
}

.game-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.triangle-cell {
  cursor: pointer;
  transition: fill 0.2s;
}

.triangle-cell:hover {
  opacity: 0.9;
}
</style>
