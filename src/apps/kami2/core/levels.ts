export interface Kami2Level {
  id: string
  name: string
  rows: number
  cols: number
  colorCount: number
  grid: number[][]
}

const VSIDE_ROWS = 14
const ROWS = 2 * VSIDE_ROWS + 1
const COLS = 10

const buildLevel = (
  id: string,
  name: string,
  colorCount: number,
  colorAt: (r: number, c: number) => number,
): Kami2Level => ({
  id,
  name,
  rows: ROWS,
  cols: COLS,
  colorCount,
  grid: Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => Math.abs(colorAt(r, c)) % colorCount),
  ),
})

export const KAMI2_LEVELS: Kami2Level[] = [
  buildLevel('classic-a', 'Classic A', 5, (r, c) => (r + c * 2 + Math.floor(r / 3)) % 5),
  buildLevel('classic-b', 'Classic B', 6, (r, c) => (r * 3 + c + Math.floor(c / 2)) % 6),
  buildLevel('classic-c', 'Classic C', 5, (r, c) => ((r % 2 === 0 ? c : c + 2) + Math.floor(r / 2)) % 5),
]

export const getKami2LevelById = (id: string): Kami2Level | undefined =>
  KAMI2_LEVELS.find((level) => level.id === id)
