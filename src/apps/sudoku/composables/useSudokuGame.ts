import { computed, ref } from 'vue'
import { DEFAULT_SOLVE_TIMEOUT_MS, DIFFICULTY_CLUES } from '../config/game'
import { SUDOKU_PRESETS } from '../config/presets'
import { outcomeLabel } from '../services/solveOutcome'
import { SolverClient } from '../services/solverClient'
import { carvePuzzle, createSolvedGrid } from '../services/sudokuSolver'
import {
  cloneGrid,
  gridsEqual,
  isBoardConsistent,
  isCellConflict,
  isGridShapeValid,
  matchesClues,
} from '../services/sudokuValidation'
import type { CellPosition, CellViewModel, Difficulty, Grid, SolveOutcome } from '../types/sudoku'

type SudokuMode = 'game' | 'edit-solve'

const sameBox = (aRow: number, aCol: number, bRow: number, bCol: number): boolean =>
  Math.floor(aRow / 3) === Math.floor(bRow / 3) && Math.floor(aCol / 3) === Math.floor(bCol / 3)

export const useSudokuGame = () => {
  const mode = ref<SudokuMode>('game')
  const difficulty = ref<Difficulty>('medium')
  const puzzle = ref<Grid>([])
  const solution = ref<Grid>([])
  const board = ref<Grid>([])
  const selectedPresetId = ref<string>('medium-1')
  const lockGivenCells = ref(true)

  const selectedCell = ref<CellPosition | null>(null)
  const mistakes = ref(0)
  const elapsedSeconds = ref(0)

  const isSolving = ref(false)
  const lastSolveOutcome = ref<SolveOutcome>('idle')

  const solverClient = new SolverClient()

  let timer: number | null = null
  let solveToken = 0

  const presets = computed(() => SUDOKU_PRESETS)
  const filteredPresets = computed(() => presets.value.filter((item) => item.difficulty === difficulty.value))
  const isEditSolveMode = computed(() => mode.value === 'edit-solve')

  const ensureSelectedPreset = () => {
    const inDifficulty = filteredPresets.value.some((item) => item.id === selectedPresetId.value)
    if (!inDifficulty) {
      selectedPresetId.value = filteredPresets.value[0]?.id ?? presets.value[0]?.id ?? ''
    }
  }

  const isGiven = (row: number, col: number): boolean =>
    lockGivenCells.value && puzzle.value[row]?.[col] !== 0

  const currentSelectedValue = computed(() => {
    if (!selectedCell.value) return 0
    return board.value[selectedCell.value.row]?.[selectedCell.value.col] ?? 0
  })

  const isComplete = computed(() =>
    board.value.length > 0 && solution.value.length > 0 && gridsEqual(board.value, solution.value),
  )

  const filledCells = computed(() =>
    board.value.reduce((count, row) => count + row.filter((value) => value !== 0).length, 0),
  )

  const formatTime = computed(() => {
    const minutes = Math.floor(elapsedSeconds.value / 60)
    const seconds = elapsedSeconds.value % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })

  const statusMessage = computed(() => {
    if (mode.value === 'edit-solve' && !lockGivenCells.value) {
      return 'Edit values freely, then run solver.'
    }
    if (isComplete.value) return 'Solved. Start a new board or change difficulty.'
    if (mistakes.value >= 10) return '10+ mistakes. Keep going or generate a new board.'
    return outcomeLabel[lastSolveOutcome.value]
  })

  const cellViewModels = computed<CellViewModel[]>(() => {
    if (!isGridShapeValid(board.value)) return []

    const selected = selectedCell.value
    return board.value.flatMap((rowValues, row) =>
      rowValues.map((value, col) => {
        const selectedNow = selected?.row === row && selected?.col === col
        const related =
          !!selected &&
          (selected.row === row || selected.col === col || sameBox(selected.row, selected.col, row, col))
        const conflict = isCellConflict(board.value, row, col)
        const wrong = value !== 0 && value !== solution.value[row]?.[col]

        return {
          row,
          col,
          value,
          given: isGiven(row, col),
          selected: selectedNow,
          related,
          matching: currentSelectedValue.value !== 0 && value === currentSelectedValue.value,
          conflict,
          wrong,
        }
      }),
    )
  })

  const stopTimer = () => {
    if (timer) {
      window.clearInterval(timer)
      timer = null
    }
  }

  const startTimer = () => {
    stopTimer()
    elapsedSeconds.value = 0
    timer = window.setInterval(() => {
      if (!isComplete.value) elapsedSeconds.value += 1
    }, 1000)
  }

  const cancelSolve = (markCancelled = true) => {
    if (isSolving.value) {
      solveToken += 1
      solverClient.cancel()
      isSolving.value = false
      if (markCancelled) {
        lastSolveOutcome.value = 'cancelled'
      }
    }
  }

  const newGame = () => {
    ensureSelectedPreset()
    const preset = presets.value.find((item) => item.id === selectedPresetId.value)
    if (preset) {
      puzzle.value = cloneGrid(preset.puzzle)
      solution.value = cloneGrid(preset.solution)
      board.value = cloneGrid(preset.puzzle)
    } else {
      const solved = createSolvedGrid()
      const nextPuzzle = carvePuzzle(solved, DIFFICULTY_CLUES[difficulty.value])
      puzzle.value = nextPuzzle
      solution.value = solved
      board.value = cloneGrid(nextPuzzle)
    }

    lockGivenCells.value = true
    selectedCell.value = null
    mistakes.value = 0
    lastSolveOutcome.value = 'idle'
    startTimer()
  }

  const loadSelectedPreset = () => {
    ensureSelectedPreset()
    newGame()
  }

  const startRandomEditBoard = () => {
    cancelSolve(false)

    const solved = createSolvedGrid()
    const nextPuzzle = carvePuzzle(solved, DIFFICULTY_CLUES[difficulty.value])
    puzzle.value = nextPuzzle
    solution.value = solved
    board.value = cloneGrid(nextPuzzle)

    lockGivenCells.value = true
    selectedCell.value = null
    mistakes.value = 0
    lastSolveOutcome.value = 'idle'
    startTimer()
  }

  const startManualEditBoard = () => {
    cancelSolve(false)
    puzzle.value = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0))
    solution.value = []
    board.value = cloneGrid(puzzle.value)

    lockGivenCells.value = false
    selectedCell.value = null
    mistakes.value = 0
    lastSolveOutcome.value = 'idle'
    startTimer()
  }

  const selectCell = (row: number, col: number) => {
    selectedCell.value = { row, col }
  }

  const applyValue = (value: number) => {
    if (!selectedCell.value || isSolving.value || isComplete.value) return

    const { row, col } = selectedCell.value
    if (isGiven(row, col)) return

    const previous = board.value[row][col]
    board.value[row][col] = value

    const becameWrong = value !== 0 && value !== solution.value[row][col]
    const wasWrong = previous !== 0 && previous !== solution.value[row][col]
    if (becameWrong && !wasWrong) mistakes.value += 1

    lastSolveOutcome.value = 'idle'
  }

  const clearSelected = () => applyValue(0)

  const moveSelection = (rowDelta: number, colDelta: number) => {
    const row = selectedCell.value?.row ?? 0
    const col = selectedCell.value?.col ?? 0
    selectedCell.value = { row: (row + rowDelta + 9) % 9, col: (col + colDelta + 9) % 9 }
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (/^[1-9]$/.test(event.key)) {
      applyValue(Number(event.key))
      return
    }

    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
      clearSelected()
      return
    }

    if (event.key === 'ArrowUp') moveSelection(-1, 0)
    if (event.key === 'ArrowDown') moveSelection(1, 0)
    if (event.key === 'ArrowLeft') moveSelection(0, -1)
    if (event.key === 'ArrowRight') moveSelection(0, 1)
  }

  const solveBoard = async () => {
    if (isSolving.value) return

    if (isComplete.value) {
      lastSolveOutcome.value = 'success'
      return
    }

    if (!isBoardConsistent(board.value)) {
      lastSolveOutcome.value = 'invalid'
      return
    }

    lastSolveOutcome.value = 'running'
    isSolving.value = true
    const token = ++solveToken

    const result = await solverClient.solve(cloneGrid(board.value), DEFAULT_SOLVE_TIMEOUT_MS)

    if (token !== solveToken) return

    isSolving.value = false

    if (result.status === 'success' && result.solution) {
      solution.value = cloneGrid(result.solution)
      if (!matchesClues(result.solution, puzzle.value)) {
        lastSolveOutcome.value = 'invalid'
        return
      }
      board.value = cloneGrid(result.solution)
      lastSolveOutcome.value = 'success'
      return
    }

    lastSolveOutcome.value = result.status
  }

  const setDifficulty = (value: Difficulty) => {
    difficulty.value = value
    ensureSelectedPreset()
    if (mode.value === 'game') {
      newGame()
    }
  }

  const setMode = (value: SudokuMode) => {
    mode.value = value
    if (value === 'game') {
      newGame()
    }
  }

  const setSelectedPreset = (id: string) => {
    selectedPresetId.value = id
  }

  const initGame = () => {
    mode.value = 'game'
    ensureSelectedPreset()
    newGame()
  }

  const dispose = () => {
    stopTimer()
    cancelSolve(false)
  }

  return {
    board,
    cellViewModels,
    clearSelected,
    difficulty,
    elapsedSeconds,
    filteredPresets,
    filledCells,
    formatTime,
    initGame,
    isEditSolveMode,
    isComplete,
    isSolving,
    lastSolveOutcome,
    mistakes,
    mode,
    newGame,
    onKeyDown,
    loadSelectedPreset,
    selectCell,
    selectedPresetId,
    setMode,
    setSelectedPreset,
    setDifficulty,
    solveBoard,
    startManualEditBoard,
    startRandomEditBoard,
    statusMessage,
    cancelSolve,
    applyValue,
    dispose,
  }
}
