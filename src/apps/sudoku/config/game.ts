import type { Difficulty } from '../types/sudoku'

export const BOARD_SIZE = 9

export const DEFAULT_SOLVE_TIMEOUT_MS = 2000

export const DIFFICULTY_CLUES: Record<Difficulty, number> = {
  easy: 40,
  medium: 32,
  hard: 26,
}
