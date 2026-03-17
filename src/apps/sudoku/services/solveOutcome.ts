import type { SolveOutcome } from '../types/sudoku'

export const outcomeLabel: Record<SolveOutcome, string> = {
  idle: 'Fill every row, column, and 3x3 box with digits 1-9.',
  running: 'Solving current board...',
  success: 'Solved. You can start a new board any time.',
  invalid: 'Board has conflicts. Fix highlighted values and try again.',
  unsolvable: 'No valid solution exists for this board state.',
  timeout: 'Solver timed out. Try again or reset the board.',
  cancelled: 'Solve cancelled. You can continue playing.',
}
