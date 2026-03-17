<script setup lang="ts">
import type { CellViewModel } from '../types/sudoku'

defineProps<{
  cell: CellViewModel
}>()

const emit = defineEmits<{
  select: [row: number, col: number]
}>()
</script>

<template>
  <button
    class="cell"
    :aria-label="`Row ${cell.row + 1}, Column ${cell.col + 1}, ${cell.value === 0 ? 'empty' : `value ${cell.value}`}`"
    :aria-pressed="cell.selected"
    :class="{
      given: cell.given,
      selected: cell.selected,
      related: cell.related,
      matching: cell.matching,
      conflict: cell.conflict,
      wrong: cell.wrong,
    }"
    @click="emit('select', cell.row, cell.col)"
  >
    {{ cell.value === 0 ? '' : cell.value }}
  </button>
</template>
