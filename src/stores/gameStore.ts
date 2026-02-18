import { defineStore } from 'pinia'
import { ref, computed, markRaw } from 'vue'
import { GameGrid, type Solution } from '../core/GameGrid'
import { GraphSolver } from '../core/GraphSolver'

// 初始化网格所需常量
export const VSIDE_ROWS = 14
export const COLS = 10
/** 编辑模式下默认颜色数量（可增删，至少 1 个） */
export const DEFAULT_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D'] as const
/** 向后兼容：若 grid 未加载则 fallback */
export const COLORS = DEFAULT_COLORS

const EDIT_STORAGE_KEY = 'kami2-edit-grid'

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F7FFF7',
  '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA'
]

function randomNewColor(existing: readonly string[]): string {
  const pool = PRESET_COLORS.filter(c => !existing.includes(c))
  if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)]
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
}

export const useGameStore = defineStore('game', () => {
  // 游戏模式：EDIT 编辑 / PLAY 测试
  const mode = ref<'EDIT' | 'PLAY'>('EDIT')

  // 颜色选择（使用索引）
  const selectedColorIndex = ref<number>(0)

  /** 调色板颜色表（全局状态），与 gameGrid.colorCount 一致；grid 中索引对应此数组下标 */
  const paletteColors = ref<string[]>([])

  // 空格键状态
  const spaceHeld = ref(false)

  // 游戏状态
  const gameGrid = ref<GameGrid | null>(null)
  const stepCount = ref(0)

  // 求解器状态
  const solution = ref<Solution | null>(null)
  const solving = ref(false)
  const selectedStepIndex = ref<number | null>(null)
  const highlightCells = ref<Array<{ r: number; c: number; color: string }>>([])
  const initialGameGridForSolution = ref<GameGrid | null>(null)
  const isBlinking = ref(false)
  let blinkTimer: number | null = null

  // 计算属性
  const regionCount = computed(() => {
    if (mode.value === 'EDIT' || !gameGrid.value) {
      return '-'
    }
    return gameGrid.value.getRegionCount()
  })
  
  // 获取当前选中的颜色字符串（用于向后兼容）
  const selectedColor = computed(() => {
    const pal = paletteColors.value
    if (!pal.length) return DEFAULT_COLORS[0]
    return pal[selectedColorIndex.value] ?? pal[0]
  })

  /** 从 localStorage 读取编辑状态，无效或不存在返回 null；会设置 paletteColors */
  const loadEditState = (): GameGrid | null => {
    try {
      const raw = localStorage.getItem(EDIT_STORAGE_KEY)
      if (!raw) return null
      const data = JSON.parse(raw) as { rows: number; cols: number; colors?: string[]; colorCount?: number; grid: number[][] }
      if (!data?.grid?.length) return null
      const colors = data.colors && data.colors.length > 0 ? data.colors : [...DEFAULT_COLORS]
      paletteColors.value = colors
      return GameGrid.fromJSON(data)
    } catch {
      return null
    }
  }

  /** 将当前编辑状态写入 localStorage（含调色板与 grid） */
  const saveEditState = () => {
    if (mode.value !== 'EDIT' || !gameGrid.value) return
    try {
      const payload = { ...gameGrid.value.toJSON(), colors: paletteColors.value }
      localStorage.setItem(EDIT_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // ignore
    }
  }

  /** 进入编辑模式时：优先从 localStorage 恢复，否则初始化新网格 */
  const loadEditStateOrInit = () => {
    const loaded = loadEditState()
    if (loaded) {
      gameGrid.value = markRaw(loaded)
      stepCount.value = 0
      selectedStepIndex.value = null
      highlightCells.value = []
      initialGameGridForSolution.value = null
      if (blinkTimer !== null) {
        clearInterval(blinkTimer)
        blinkTimer = null
      }
      isBlinking.value = false
    } else {
      initGrid()
    }
  }

  // Actions
  const setMode = (newMode: 'EDIT' | 'PLAY') => {
    mode.value = newMode
    if (newMode === 'EDIT') {
      loadEditStateOrInit()
    }
  }
  
  const setSelectedColorIndex = (index: number) => {
    if (index >= 0 && index < paletteColors.value.length) {
      selectedColorIndex.value = index
    }
  }

  const setSelectedColor = (color: string) => {
    const index = paletteColors.value.indexOf(color)
    if (index >= 0) selectedColorIndex.value = index
  }
  
  const setSpaceHeld = (held: boolean) => {
    spaceHeld.value = held
  }
  
  const setGameGrid = (newGameGrid: GameGrid) => {
    gameGrid.value = markRaw(newGameGrid)
    saveEditState()
  }

  /** 编辑模式下增加一种颜色（测试模式不可用） */
  const addColor = () => {
    if (mode.value !== 'EDIT' || !gameGrid.value) return
    const pal = paletteColors.value
    paletteColors.value = [...pal, randomNewColor(pal)]
    const newGrid = new GameGrid(
      gameGrid.value.vside_rows,
      gameGrid.value.cols,
      paletteColors.value.length,
      gameGrid.value.grid.map(col => [...col])
    )
    gameGrid.value = markRaw(newGrid)
    saveEditState()
  }

  /** 编辑模式下删除一种颜色，至少保留 1 个（测试模式不可用） */
  const removeColor = (index: number) => {
    if (mode.value !== 'EDIT' || !gameGrid.value) return
    const pal = paletteColors.value
    if (pal.length <= 1 || index < 0 || index >= pal.length) return
    paletteColors.value = pal.filter((_, i) => i !== index)
    const remap = (v: number): number => {
      if (v === index) return 0
      if (v > index) return v - 1
      return v
    }
    const grid = gameGrid.value.grid.map(col => col.map(remap))
    const newGrid = new GameGrid(
      gameGrid.value.vside_rows,
      gameGrid.value.cols,
      paletteColors.value.length,
      grid
    )
    gameGrid.value = markRaw(newGrid)
    if (selectedColorIndex.value >= paletteColors.value.length) {
      selectedColorIndex.value = paletteColors.value.length - 1
    } else if (selectedColorIndex.value > index) {
      selectedColorIndex.value--
    }
    saveEditState()
  }

  const incrementStepCount = () => {
    stepCount.value++
  }
  
  const resetStepCount = () => {
    stepCount.value = 0
  }
  
  // 初始化网格（重置画布，默认 3 色）
  const initGrid = () => {
    paletteColors.value = [...DEFAULT_COLORS]
    gameGrid.value = markRaw(new GameGrid(VSIDE_ROWS, COLS, paletteColors.value.length))
    stepCount.value = 0
    selectedStepIndex.value = null
    highlightCells.value = []
    initialGameGridForSolution.value = null
    selectedColorIndex.value = 0
    if (blinkTimer !== null) {
      clearInterval(blinkTimer)
      blinkTimer = null
    }
    isBlinking.value = false
    saveEditState()
  }
  
  // 求解函数
  const solvePuzzle = () => {
    if (!gameGrid.value) return
    
    solving.value = true
    solution.value = null
    selectedStepIndex.value = null
    highlightCells.value = []
    
    // 清除之前的闪烁定时器
    if (blinkTimer !== null) {
      clearInterval(blinkTimer)
      blinkTimer = null
    }
    isBlinking.value = false
    
    // 保存当前 gameGrid 状态作为求解的初始状态
    initialGameGridForSolution.value = markRaw(gameGrid.value.clone())
    
    // 使用 setTimeout 让 UI 更新，然后使用 GraphSolver 求解
    const grid = gameGrid.value
    const colors = paletteColors.value
    setTimeout(() => {
      try {
        if (!grid) {
          solution.value = null
          return
        }
        const graphSolver = new GraphSolver(grid)
        const graphResult = graphSolver.solve(15)
        const result: Solution | null = graphResult
          ? graphSolver.toSolution(graphResult.path, colors)
          : null
        solution.value = result

        if (result) {
          console.log('=== 求解结果 (GraphSolver) ===')
          console.log(`最少步骤数：${result.steps}`)
          console.log('解决方案：')
          result.path.forEach((step, index) => {
            console.log(`${index + 1}. ${step.description}`)
          })
          console.log('===============')
        } else {
          console.log('未找到解决方案（可能超过最大搜索深度）')
        }
      } catch (error) {
        console.error('求解过程中出错：', error)
      } finally {
        solving.value = false
      }
    }, 100)
  }
  
  // 选择步骤并高亮对应的区域（闪烁几次后自动消失）
  const selectStep = (index: number) => {
    if (!solution.value?.path[index] || !initialGameGridForSolution.value) return
    
    // 清除之前的闪烁定时器
    if (blinkTimer !== null) {
      clearInterval(blinkTimer)
      blinkTimer = null
    }
    
    selectedStepIndex.value = index
    const step = solution.value.path[index]
    
    // 使用求解时的初始 gameGrid 状态来计算区域（因为解决方案是基于初始状态的）
    const regionCells = initialGameGridForSolution.value.getRegionCells(
      step.region.r,
      step.region.c
    )
    
    // 设置高亮信息（使用步骤的目标颜色作为边框颜色）
    highlightCells.value = regionCells.map(cell => ({
      r: cell.r,
      c: cell.c,
      color: step.color
    }))
    
    // 开始闪烁效果
    isBlinking.value = true
    let blinkCount = 1 // 从1开始，因为已经显示了第一次
    const maxBlinks = 6 // 闪烁6次（3次完整循环：显示-隐藏-显示-隐藏-显示-隐藏）
    const blinkInterval = 300 // 每次闪烁间隔300ms
    
    // 第一次已经显示，从第二次开始定时闪烁
    blinkTimer = globalThis.setInterval(() => {
      blinkCount++
      
      if (blinkCount % 2 === 0) {
        // 偶数次：显示高亮
        highlightCells.value = regionCells.map(cell => ({
          r: cell.r,
          c: cell.c,
          color: step.color
        }))
      } else {
        // 奇数次：隐藏高亮
        highlightCells.value = []
      }
      
      if (blinkCount >= maxBlinks) {
        // 闪烁完成，清除高亮和定时器
        if (blinkTimer !== null) {
          clearInterval(blinkTimer)
        }
        blinkTimer = null
        highlightCells.value = []
        isBlinking.value = false
        selectedStepIndex.value = null
      }
    }, blinkInterval)
  }
  
  // 清理函数
  const cleanup = () => {
    if (blinkTimer !== null) {
      clearInterval(blinkTimer)
      blinkTimer = null
    }
    isBlinking.value = false
  }

  return {
    // State
    mode,
    selectedColorIndex,
    selectedColor,
    paletteColors,
    spaceHeld,
    gameGrid,
    stepCount,
    solution,
    solving,
    selectedStepIndex,
    highlightCells,
    isBlinking,

    // Computed
    regionCount,

    // Actions
    setMode,
    setSelectedColorIndex,
    setSelectedColor,
    setSpaceHeld,
    setGameGrid,
    addColor,
    removeColor,
    incrementStepCount,
    resetStepCount,
    initGrid,
    loadEditStateOrInit,
    solvePuzzle,
    selectStep,
    cleanup
  }
})
