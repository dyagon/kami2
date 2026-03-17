import type { Grid } from '../types/sudoku'
import { solveWithDeadline } from '../services/sudokuSolver'

interface SolveMessage {
  grid: Grid
  timeoutMs: number
}

self.onmessage = (event: MessageEvent<SolveMessage>) => {
  const { grid, timeoutMs } = event.data
  const result = solveWithDeadline(grid, timeoutMs)
  self.postMessage(result)
}
