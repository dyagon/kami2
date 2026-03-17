<template>
  <div class="solver-panel">


    <!-- 游戏模式：显示求解按钮或最优解 -->
    <template v-if="gameStore.mode === 'PLAY'">
      <div v-if="gameStore.solving" class="solve-controls">
        <button 
          @click="handleSolve" 
          :disabled="true"
          class="solve-button"
        >
          {{ t('kami2.solving') }}
        </button>
        <button 
          @click="handleTerminate" 
          class="terminate-button"
        >
          {{ t('kami2.terminate') }}
        </button>
      </div>
      <button 
        v-else-if="!gameStore.solution"
        @click="handleSolve" 
        class="solve-button"
      >
        {{ t('kami2.solveButtonIdlePlay') }}
      </button>
      
      <div v-if="gameStore.solution" class="solution-header">
        <div class="solution-title">{{ t('kami2.solutionHeader') }}</div>
        <div class="solution-steps-count">
          {{ t('kami2.solutionInfoSteps') }}{{ gameStore.solution.steps }}
        </div>
      </div>
    </template>
    
    <!-- 编辑模式：显示求解按钮 -->
    <template v-else>
      <div v-if="gameStore.solving" class="solve-controls">
        <button 
          @click="handleSolve" 
          :disabled="true"
          class="solve-button"
        >
          {{ t('kami2.solving') }}
        </button>
        <button 
          @click="handleTerminate" 
          class="terminate-button"
        >
          {{ t('kami2.terminate') }}
        </button>
      </div>
      <button 
        v-else
        @click="handleSolve" 
        class="solve-button"
      >
        {{ t('kami2.solveButtonIdleEdit') }}
      </button>
    </template>

    <!-- 解信息（得到解后显示） -->
    <div v-if="gameStore.solutionMetadata" class="solve-info">
      <div class="info-title">{{ t('kami2.solutionInfoTitle') }}</div>
      <div class="info-row">
        <span class="info-label">{{ t('kami2.solutionInfoSteps') }}</span>
        {{ gameStore.solution?.steps ?? '-' }}
      </div>
      <div class="info-row">
        <span class="info-label">{{ t('kami2.solutionInfoMethod') }}</span>
        {{ gameStore.solutionMetadata.method }}
      </div>
    </div>

    <!-- 显示解决方案步骤 -->
    <div v-if="gameStore.solution && gameStore.solution.path.length > 0" class="solution-path">
      <div 
        v-for="(step, index) in gameStore.solution.path" 
        :key="index" 
        class="solution-step"
        :class="{ active: gameStore.selectedStepIndex === index }"
        @click="handleStepClick(index)"
      >
        <div class="step-content">
          <span class="step-number">
            {{ t('kami2.stepPrefix', { index: index + 1 }) }}
          </span>
          <span class="step-color-swatch" :style="{ backgroundColor: step.color }"></span>
          <span class="step-text">
            {{ t('kami2.stepDescription', { row: step.region.r, col: step.region.c }) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()
const { t } = useI18n()

const handleSolve = () => {
  gameStore.solvePuzzle()
}

const handleTerminate = () => {
  gameStore.terminateSolve()
}

const handleStepClick = (index: number) => {
  gameStore.selectStep(index)
}
</script>

<style scoped>
.solver-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.solve-info {
  padding: 12px;
  background: #fcfdfb;
  border: 1px solid color-mix(in srgb, #254a61, white 80%);
  border-radius: 12px;
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-title {
  font-weight: 600;
  color: #102233;
  margin-bottom: 4px;
}

.info-row {
  color: #102233;
}

.info-label {
  color: #4f6270;
  margin-right: 4px;
}

.solve-controls {
  display: flex;
  gap: 8px;
}

.solve-button {
  padding: 0.55rem 1rem;
  background: linear-gradient(90deg, #daf4ff, #bde8ff);
  color: #102233;
  border: 2px solid transparent;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.9rem;
  transition: transform 120ms ease, border-color 180ms ease, background 180ms ease;
}

.solve-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, #254a61, white 40%);
}

.solve-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.terminate-button {
  padding: 0.55rem 1rem;
  background: #f8ece8;
  color: #102233;
  border: 2px solid transparent;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.9rem;
  transition: transform 120ms ease, border-color 180ms ease, background 180ms ease;
}

.terminate-button:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, #254a61, white 40%);
}

.solution-path {
  margin-top: 16px;
  margin-bottom: 20px;
  padding: 12px;
  background: #fcfdfb;
  border: 1px solid color-mix(in srgb, #254a61, white 80%);
  border-radius: 12px;
  font-size: 0.85rem;
}

.solution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.solution-title {
  font-weight: 600;
  color: #102233;
}

.solution-steps-count {
  font-weight: 600;
  color: #4f6270;
  font-size: 0.9rem;
}

.solution-step {
  padding: 8px;
  color: #666;
  line-height: 1.4;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  margin-bottom: 4px;
}

.solution-step:hover {
  background-color: #f0f0f0;
}

.solution-step.active {
  background-color: #e6f0ff;
  border: 1px solid color-mix(in srgb, #254a61, white 55%);
}

.step-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-number {
  font-weight: 600;
  color: #102233;
}

.step-color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #ccc;
  flex-shrink: 0;
}

.step-text {
  flex: 1;
  font-size: 0.85rem;
}
</style>
