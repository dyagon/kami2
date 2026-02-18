<template>
  <div class="color-palette">
    <template v-for="(color, index) in colors" :key="index">
      <div class="swatch-wrap">
        <div
          :style="{ backgroundColor: color }"
          :class="['color-swatch', { active: selectedColorIndex === index }]"
          @click="handleColorClick(index)"
        />
        <button
          v-if="canEdit && colors.length > 1"
          type="button"
          class="btn-remove"
          :title="'删除颜色'"
          @click.stop="handleRemove(index)"
        >
          ×
        </button>
      </div>
    </template>
    <button
      v-if="canEdit"
      type="button"
      class="btn-add"
      title="添加颜色"
      @click="handleAdd"
    >
      +
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()

const canEdit = computed(() => gameStore.mode === 'EDIT')
const colors = computed(() => gameStore.paletteColors)
const selectedColorIndex = computed(() => gameStore.selectedColorIndex)

const handleColorClick = (index: number) => {
  gameStore.setSelectedColorIndex(index)
}

const handleAdd = () => {
  gameStore.addColor()
}

const handleRemove = (index: number) => {
  gameStore.removeColor(index)
}
</script>

<style scoped>
.color-palette {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.swatch-wrap {
  display: flex;
  align-items: center;
  gap: 2px;
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

.btn-add,
.btn-remove {
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid #ccc;
  background: #f5f5f5;
  color: #666;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-add:hover,
.btn-remove:hover {
  background: #e0e0e0;
  color: #333;
}

.btn-add {
  font-size: 18px;
}
</style>
