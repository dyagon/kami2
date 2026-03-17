import { BOARD_SIZE } from '../config/game'
import type { Grid } from '../types/sudoku'

export const cloneGrid = (grid: Grid): Grid => grid.map((row) => [...row])

export const emptyGrid = (): Grid =>
  Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => 0))

const boxStart = (value: number): number => Math.floor(value / 3) * 3

const validRange = (value: number): boolean => Number.isInteger(value) && value >= 0 && value <= BOARD_SIZE

export const isValidPlacement = (grid: Grid, row: number, col: number, value: number): boolean => {
  for (let i = 0; i < BOARD_SIZE; i += 1) {
    if (grid[row][i] === value) return false
    if (grid[i][col] === value) return false
  }

  const startRow = boxStart(row)
  const startCol = boxStart(col)
  for (let r = startRow; r < startRow + 3; r += 1) {
    for (let c = startCol; c < startCol + 3; c += 1) {
      if (grid[r][c] === value) return false
    }
  }

  return true
}

export const isGridShapeValid = (grid: Grid): boolean =>
  Array.isArray(grid) &&
  grid.length === BOARD_SIZE &&
  grid.every((row) => Array.isArray(row) && row.length === BOARD_SIZE && row.every(validRange))

export const isCellConflict = (grid: Grid, row: number, col: number): boolean => {
  const value = grid[row][col]
  if (value === 0) return false

  for (let i = 0; i < BOARD_SIZE; i += 1) {
    if (i !== col && grid[row][i] === value) return true
    if (i !== row && grid[i][col] === value) return true
  }

  const startRow = boxStart(row)
  const startCol = boxStart(col)
  for (let r = startRow; r < startRow + 3; r += 1) {
    for (let c = startCol; c < startCol + 3; c += 1) {
      if ((r !== row || c !== col) && grid[r][c] === value) return true
    }
  }

  return false
}

export const isBoardConsistent = (grid: Grid): boolean => {
  if (!isGridShapeValid(grid)) return false

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (isCellConflict(grid, row, col)) return false
    }
  }

  return true
}

export const matchesClues = (grid: Grid, clues: Grid): boolean => {
  if (!isGridShapeValid(grid) || !isGridShapeValid(clues)) return false

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (clues[row][col] !== 0 && grid[row][col] !== clues[row][col]) return false
    }
  }

  return true
}

export const gridsEqual = (left: Grid, right: Grid): boolean => {
  if (!isGridShapeValid(left) || !isGridShapeValid(right)) return false
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (left[row][col] !== right[row][col]) return false
    }
  }
  return true
}
