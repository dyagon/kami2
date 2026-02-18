import { UnionFind } from './UnionFind'

// 几何常数
export const SIDE_A = 56 // 边长 a (像素)
export const HALF_A = SIDE_A / 2 // 半宽 (水平步进单位)
export const TRI_H = (Math.sqrt(3) / 2) * SIDE_A // 高 h

/** 求解结果：最少步骤及操作路径 */
export interface Solution {
  steps: number
  path: Array<{
    region: { r: number; c: number }
    color: string
    description: string
  }>
}

/** DFS 求解时的性能统计（用于观察/打印） */
export interface SolvePerformance {
  /** 总耗时（毫秒） */
  elapsedMs: number
  /** 访问过的不同状态数 */
  statesVisited: number
  /** 递归达到的最大深度（步数） */
  maxDepth: number
  /** 初始区域数 */
  initialRegionCount: number
  /** 是否找到解 */
  found: boolean
}


/**
 * 游戏网格：使用二维数组存储 colorIndex（索引 < colorCount），不保存颜色表，颜色数量由全局状态决定。
 */
export class GameGrid {
  readonly vside_rows: number
  readonly rows: number
  readonly height: number
  readonly cols: number
  /** 颜色数量，由全局状态（调色板）决定；grid 中索引均小于此值 */
  readonly colorCount: number
  /** grid[col][row] = colorIndex，唯一会修改处为 floodFill */
  grid: number[][]
  uf: UnionFind

  constructor(
    vside_rows: number,
    cols: number,
    colorCount: number,
    grid?: number[][]
  ) {
    this.vside_rows = vside_rows
    this.rows = 2 * vside_rows + 1
    this.height = vside_rows * SIDE_A
    this.cols = cols
    this.colorCount = Math.max(1, colorCount)
    this.grid = grid ?? Array.from({ length: cols }, () =>
      Array.from({ length: this.rows }, () => 0)
    )
    this.uf = this.buildUnionFind()
  }

  /**
   * 计算三角形顶点坐标（SVG points 字符串）
   */
  getTrianglePoints(c: number, r: number): string {
    const startX = c * TRI_H
    let startY = (r - 1) * HALF_A
    const isRight = (r + c) % 2 === 0

    if (r === 0) {
      startY = 0
      if (isRight) {
        return `${startX},${startY} ${startX + TRI_H},${startY} ${startX},${startY + HALF_A}`
      }
      return `${startX},${startY} ${startX + TRI_H},${startY} ${startX + TRI_H},${startY + HALF_A}`
    }
    if (r === this.rows - 1) {
      startY = this.height
      if (isRight) {
        return `${startX},${startY} ${startX},${startY - HALF_A} ${startX + TRI_H},${startY}`
      }
      return `${startX + TRI_H},${startY} ${startX + TRI_H},${startY - HALF_A} ${startX},${startY}`
    }
    if (isRight) {
      return `${startX},${startY} ${startX},${startY + SIDE_A} ${startX + TRI_H},${startY + HALF_A}`
    }
    return `${startX + TRI_H},${startY} ${startX + TRI_H},${startY + SIDE_A} ${startX},${startY + HALF_A}`
  }

  /**
   * 获取 (r, c) 的联通邻居坐标
   */
  getNeighbors(r: number, c: number): { r: number; c: number }[] {
    const neighbors: { r: number; c: number }[] = []
    if (r > 0) neighbors.push({ r: r - 1, c })
    if (r < this.rows - 1) neighbors.push({ r: r + 1, c })
    const isRight = (r + c) % 2 === 0
    if (isRight && c > 0) {
      neighbors.push({ r, c: c - 1 })
    } else if (!isRight && c < this.cols - 1) {
      neighbors.push({ r, c: c + 1 })
    }
    return neighbors
  }

  getColorIndex(r: number, c: number): number {
    return this.grid[c]?.[r] ?? 0
  }

  /** 根据外部颜色表取格子的颜色字符串（颜色表由全局状态提供） */
  getColorAt(r: number, c: number, colors: readonly string[]): string {
    const idx = this.getColorIndex(r, c)
    return colors[idx] ?? colors[0] ?? '#fff'
  }

  /** 深拷贝 */
  clone(): GameGrid {
    return new GameGrid(
      this.vside_rows,
      this.cols,
      this.colorCount,
      this.grid.map(col => [...col])
    )
  }

  /** 序列化（不包含颜色表，仅 colorCount 与 grid） */
  toJSON(): { rows: number; cols: number; colorCount: number; grid: number[][] } {
    return {
      rows: this.rows,
      cols: this.cols,
      colorCount: this.colorCount,
      grid: this.grid.map(col => [...col])
    }
  }

  /** 从 JSON 反序列化（支持旧格式 data.colors 或新格式 data.colorCount） */
  static fromJSON(data: {
    rows: number
    cols: number
    grid: number[][]
    colors?: string[]
    colorCount?: number
  }): GameGrid {
    const vside_rows = (data.rows - 1) >> 1
    const colorCount = data.colors?.length ?? data.colorCount ?? 1
    return new GameGrid(
      vside_rows,
      data.cols,
      colorCount,
      data.grid.map(col => [...col])
    )
  }

  /** 根据当前 grid 构建并查集（仅用于初始化或 clone 后的 uf） */
  buildUnionFind(): UnionFind {
    const { rows, cols, grid } = this
    const totalCells = rows * cols
    if (!grid?.length || grid.length < cols || !grid[0]?.length || grid[0].length < rows) {
      return new UnionFind(totalCells)
    }
    const uf = new UnionFind(totalCells)
    const idx = (r: number, c: number) => r * cols + c
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[c]?.[r] === undefined) continue
        const currentIdx = idx(r, c)
        const currentColorIndex = grid[c][r]
        for (const n of this.getNeighbors(r, c)) {
          if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols && grid[n.c]?.[n.r] !== undefined) {
            const neighborIdx = idx(n.r, n.c)
            if (currentColorIndex === grid[n.c][n.r]) {
              uf.union(currentIdx, neighborIdx)
            }
          }
        }
      }
    }
    return uf
  }

  /** 联通区域数量（直接读维护的并查集） */
  getRegionCount(): number {
    return this.uf.count
  }

  /** 状态字符串（用于 BFS 去重） */
  getStateKey(): string {
    return this.grid.map(col => col.join(',')).join('|')
  }

  /** 将 (startR, startC) 所在联通区域染成新颜色，原地修改 grid 并更新并查集 uf，不返回新网格 */
  floodFill(startR: number, startC: number, newColorIndex: number): void {
    const g = this.grid
    const oldColorIndex = this.getColorIndex(startR, startC)
    if (oldColorIndex === newColorIndex) return
    const idx = (r: number, c: number) => r * this.cols + c
    const startIdx = idx(startR, startC)
    g[startC][startR] = newColorIndex
    for (const nb of this.getNeighbors(startR, startC)) {
      if (nb.r >= 0 && nb.r < this.rows && nb.c >= 0 && nb.c < this.cols && g[nb.c]?.[nb.r] === newColorIndex) {
        this.uf.union(startIdx, idx(nb.r, nb.c))
      }
    }
    const queue: { r: number; c: number }[] = [{ r: startR, c: startC }]
    const visited = new Set<string>()
    visited.add(`${startR},${startC}`)
    while (queue.length > 0) {
      const curr = queue.shift()!
      const currIdx = idx(curr.r, curr.c)
      for (const n of this.getNeighbors(curr.r, curr.c)) {
        const nKey = `${n.r},${n.c}`
        if (visited.has(nKey)) continue
        if (n.c < 0 || n.c >= this.cols || n.r < 0 || n.r >= this.rows || g[n.c]?.[n.r] === undefined) continue
        if (g[n.c][n.r] === oldColorIndex) {
          g[n.c][n.r] = newColorIndex
          this.uf.union(currIdx, idx(n.r, n.c))
          for (const nb of this.getNeighbors(n.r, n.c)) {
            if (nb.r >= 0 && nb.r < this.rows && nb.c >= 0 && nb.c < this.cols && g[nb.c]?.[nb.r] === newColorIndex) {
              this.uf.union(idx(n.r, n.c), idx(nb.r, nb.c))
            }
          }
          visited.add(nKey)
          queue.push(n)
        }
      }
    }
  }


  /** 指定位置所在区域的所有格子坐标 */
  getRegionCells(startR: number, startC: number): { r: number; c: number }[] {
    const cells: { r: number; c: number }[] = []
    const targetColorIndex = this.getColorIndex(startR, startC)
    const queue = [{ r: startR, c: startC }]
    const visited = new Set<string>()
    visited.add(`${startR},${startC}`)
    cells.push({ r: startR, c: startC })
    while (queue.length > 0) {
      const curr = queue.shift()!
      for (const n of this.getNeighbors(curr.r, curr.c)) {
        const nKey = `${n.r},${n.c}`
        if (visited.has(nKey)) continue
        if (n.c < 0 || n.c >= this.cols || n.r < 0 || n.r >= this.rows) continue
        if (this.grid[n.c]?.[n.r] === targetColorIndex) {
          visited.add(nKey)
          cells.push({ r: n.r, c: n.c })
          queue.push(n)
        }
      }
    }
    return cells
  }

  // /**
  //  * DFS 求解：回溯 + 剪枝，返回最少步数解。
  //  * 进入下一状态前存储当前 grid 与 uf，然后 floodFill 原地更新，回溯时恢复状态。
  //  * @param options.logPerformance 为 true 时在控制台打印性能统计
  //  * @param options.onProgress 每访问一定数量状态时回调（可用来打点观察进度）
  //  */
  // solve(options?: { ... }): Solution | null {
  //   // 1. 如果区域很少，直接返回
  //   if (this.getRegionCount() <= 1) return { steps: 0, path: [] };
    
  //   // 2. 实例化图解算器
  //   const graphSolver = new GraphSolver(this);
    
  //   // 3. 运行 IDA* 求解
  //   // 假设最大步数限制为 15，避免死锁
  //   const graphResult = graphSolver.solve(15); 
    
  //   if (!graphResult) return null;
 
  //   // 4. 将图解算结果转换为 Solution 格式
  //   // 这一步你需要维护一个 ID -> (r,c) 的映射来填充 region 字段
  //   // 以及通过 colorIndex 获取 options.colors 中的字符串
    
  //   // ... 转换逻辑 ...
    
  //   return finalSolution;
  // }
}
