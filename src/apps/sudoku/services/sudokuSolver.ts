import { BOARD_SIZE } from '../config/game'
import type { Grid } from '../types/sudoku'
import { cloneGrid, isGridShapeValid, isValidPlacement } from './sudokuValidation'

const values = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const fillGrid = (grid: Grid, index = 0): boolean => {
  if (index === BOARD_SIZE * BOARD_SIZE) return true

  const row = Math.floor(index / BOARD_SIZE)
  const col = index % BOARD_SIZE
  if (grid[row][col] !== 0) return fillGrid(grid, index + 1)

  for (const value of shuffle(values)) {
    if (isValidPlacement(grid, row, col, value)) {
      grid[row][col] = value
      if (fillGrid(grid, index + 1)) return true
      grid[row][col] = 0
    }
  }

  return false
}

export const createSolvedGrid = (): Grid => {
  const grid: Grid = Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => 0))
  fillGrid(grid)
  return grid
}

export const carvePuzzle = (solved: Grid, clues: number): Grid => {
  const puzzle = cloneGrid(solved)
  const indexes = shuffle(Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => index))
  const toRemove = Math.max(0, BOARD_SIZE * BOARD_SIZE - clues)

  for (let i = 0; i < toRemove; i += 1) {
    const index = indexes[i]
    const row = Math.floor(index / BOARD_SIZE)
    const col = index % BOARD_SIZE
    puzzle[row][col] = 0
  }

  return puzzle
}

const shouldStop = (deadlineMs: number): boolean => Date.now() > deadlineMs

const solveRecursive = (grid: Grid, index: number, deadlineMs: number): boolean => {
  if (shouldStop(deadlineMs)) {
    throw new Error('deadline-exceeded')
  }

  if (index === BOARD_SIZE * BOARD_SIZE) return true

  const row = Math.floor(index / BOARD_SIZE)
  const col = index % BOARD_SIZE
  if (grid[row][col] !== 0) return solveRecursive(grid, index + 1, deadlineMs)

  for (const value of values) {
    if (isValidPlacement(grid, row, col, value)) {
      grid[row][col] = value
      if (solveRecursive(grid, index + 1, deadlineMs)) return true
      grid[row][col] = 0
    }
  }

  return false
}

export const solveWithDeadline = (input: Grid, timeoutMs: number): { status: 'success' | 'unsolvable' | 'timeout'; solution?: Grid } => {
  if (!isGridShapeValid(input)) return { status: 'unsolvable' }

  const grid = cloneGrid(input)
  const deadlineMs = Date.now() + timeoutMs

  try {
    const solved = solveRecursive(grid, 0, deadlineMs)
    return solved ? { status: 'success', solution: grid } : { status: 'unsolvable' }
  } catch {
    return { status: 'timeout' }
  }
}
