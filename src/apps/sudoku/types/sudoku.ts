export type Grid = number[][]

export type Difficulty = 'easy' | 'medium' | 'hard'

export type SolveOutcome =
  | 'idle'
  | 'running'
  | 'success'
  | 'invalid'
  | 'unsolvable'
  | 'timeout'
  | 'cancelled'

export interface CellPosition {
  row: number
  col: number
}

export interface SolverResult {
  status: Exclude<SolveOutcome, 'idle' | 'running'>
  solution?: Grid
}

export interface PuzzleState {
  puzzle: Grid
  solution: Grid
}

export interface CellViewModel {
  row: number
  col: number
  value: number
  given: boolean
  selected: boolean
  related: boolean
  matching: boolean
  conflict: boolean
  wrong: boolean
}
