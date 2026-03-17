<script setup lang="ts">
import type { CellViewModel } from '../types/sudoku'
import SudokuCell from './SudokuCell.vue'

defineProps<{
  cells: CellViewModel[]
}>()

const emit = defineEmits<{
  select: [row: number, col: number]
}>()
</script>

<template>
  <div class="board-wrap">
    <div class="sudoku-grid" role="grid" aria-label="Sudoku board">
      <SudokuCell
        v-for="cell in cells"
        :key="`${cell.row}-${cell.col}`"
        :cell="cell"
        @select="(row, col) => emit('select', row, col)"
      />
    </div>
  </div>
</template>
