import { GameGrid, type Solution } from './GameGrid'

// 简单的图节点定义
interface RegionNode {
  id: number
  color: number
  size: number // 该区域包含的格子数（启发式搜索可用）
  neighbors: Set<number> // 邻居节点的 ID
}

export class GraphSolver {
  private readonly nodes: Map<number, RegionNode> = new Map()
  private initialRegionCount: number = 0
  /** 每个区域 ID 对应的一个代表格坐标 (r, c)，用于将图解结果映射回棋盘步骤 */
  private readonly idToCoord: Map<number, { r: number; c: number }> = new Map()

  constructor(private readonly gameGrid: GameGrid) {
    this.buildGraph()
  }

  /**
   * 将像素网格转换为区域邻接图 (Region Adjacency Graph)
   * 极大地减小了搜索空间
   */
  private buildGraph() {
    const { rows, cols } = this.gameGrid
    const grid = this.gameGrid.grid
    const regionMap = new Int32Array(rows * cols).fill(-1)
    const getIdx = (r: number, c: number) => c * rows + r
    
    let regionIdCounter = 0
    this.nodes.clear()

    // 1. BFS/FloodFill 识别所有区域并分配 ID
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const idx = getIdx(r, c)
        if (regionMap[idx] !== -1) continue // 已访问

        const color = grid[c][r]
        const currentId = regionIdCounter++
        const node: RegionNode = { id: currentId, color, size: 0, neighbors: new Set() }
        this.nodes.set(currentId, node)
        this.idToCoord.set(currentId, { r, c })

        // 局部 BFS 找当前连通块
        const queue = [{ r, c }]
        regionMap[idx] = currentId
        node.size++

        let head = 0
        while (head < queue.length) {
          const curr = queue[head++]
          const neighbors = this.gameGrid.getNeighbors(curr.r, curr.c)
          for (const n of neighbors) {
            if (n.c < 0 || n.c >= cols || n.r < 0 || n.r >= rows) continue
            const nIdx = getIdx(n.r, n.c)
            
            // 如果颜色相同，归入当前区域
            if (grid[n.c][n.r] === color) {
              if (regionMap[nIdx] === -1) {
                regionMap[nIdx] = currentId
                node.size++
                queue.push(n)
              }
            } 
            // 如果颜色不同，标记邻接关系（稍后处理，或者在这里预处理）
          }
        }
      }
    }

    this.initialRegionCount = regionIdCounter

    // 2. 建立区域间的邻接关系
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const currentId = regionMap[getIdx(r, c)]
        const neighbors = this.gameGrid.getNeighbors(r, c)
        for (const n of neighbors) {
          if (n.c < 0 || n.c >= cols || n.r < 0 || n.r >= rows) continue
          const neighborId = regionMap[getIdx(n.r, n.c)]
          if (currentId !== neighborId) {
            this.nodes.get(currentId)!.neighbors.add(neighborId)
            this.nodes.get(neighborId)!.neighbors.add(currentId)
          }
        }
      }
    }
  }

  /**
   * 使用 IDA* (Iterative Deepening A*) 求解
   */
  solve(maxDepthLimit: number = 10): { steps: number; path: any[] } | null {
    // 初始状态哈希
    const initialStateKey = this.serializeState(this.nodes)
    
    // 迭代加深：先搜1步能解吗？不能搜2步... 直到上限
    for (let limit = 0; limit <= maxDepthLimit; limit++) {
      const result = this.dfs(this.nodes, 0, limit, [])
      if (result) return result
    }
    return null
  }

  /**
   * 深度优先搜索，但是在图层面上，且带有状态回溯
   */
  private dfs(
    currentNodes: Map<number, RegionNode>,
    depth: number,
    limit: number,
    path: any[]
  ): { steps: number; path: any[] } | null {
    
    // 1. 成功条件：只剩下一个连通区域
    if (currentNodes.size === 1) {
      return { steps: depth, path }
    }

    // 2. 剪枝
    // 估价函数 h(n)：当前图中剩下的颜色数量 - 1 (或者区域数相关的更强估价)
    // 如果 当前步数 + 最少还需要步数 > 限制，则剪枝
    const h = this.heuristic(currentNodes)
    if (depth + h > limit) return null

    // 3. 寻找所有可能的移动
    // 优化策略：只尝试将某个区域变成它的“邻居”的颜色
    // 对于 Kami 这里的逻辑是：点击一个区域，将其变成另一种颜色。
    // 有效移动通常是：将区域 A 变成其邻居 B 的颜色，从而合并 A 和 B。
    
    // 为了避免全图遍历，我们可以在这里做一些贪心排序：优先合并导致邻居减少最多的操作
    // 这里为了演示逻辑，遍历所有节点（实际可优化为只遍历“活跃”节点）
    
    // 注意：在图结构中，“染色”实际上是“节点合并”
    
    // 我们需要一个去重机制，避免重复搜索同一状态
    // (由于 IDA* 这里的状态管理较复杂，简化版直接递归)

    const moves = this.getPossibleMoves(currentNodes)
    
    for (const move of moves) {
      // 执行移动：生成新图
      const nextNodes = this.applyMove(currentNodes, move.regionId, move.targetColor)
      
      const res = this.dfs(nextNodes, depth + 1, limit, [
        ...path, 
        { regionId: move.regionId, color: move.targetColor } // 此时只能存 ID，最后再映射回坐标
      ])
      if (res) return res
    }

    return null
  }

  // 估价函数：最少还需要几步？
  // 最简单的：图中还剩下的不同颜色数量 - 1。如果剩3种颜色，至少还要染2次。
  private heuristic(nodes: Map<number, RegionNode>): number {
    const colors = new Set<number>()
    for (const node of nodes.values()) {
      colors.add(node.color)
    }
    return Math.max(0, colors.size - 1)
  }

  // 获取有效移动：(regionId, targetColor)
  private getPossibleMoves(nodes: Map<number, RegionNode>) {
    const moves: { regionId: number; targetColor: number; score: number }[] = []
    
    // 策略：只允许将区域变成它邻居的颜色
    // 遍历所有区域
    for (const node of nodes.values()) {
      const neighborColors = new Set<number>()
      for (const nId of node.neighbors) {
        const neighbor = nodes.get(nId)
        if (neighbor) neighborColors.add(neighbor.color)
      }

      for (const color of neighborColors) {
        // 简单启发式：优先合并邻居多的
        moves.push({ regionId: node.id, targetColor: color, score: 0 })
      }
    }
    
    // 可以在这里对 moves 进行排序，优先尝试更有希望的路径
    return moves
  }

  /**
   * 核心逻辑：在图上执行合并
   * 这是一个纯函数，返回新的图结构，不修改入参
   */
  private applyMove(nodes: Map<number, RegionNode>, targetId: number, newColor: number): Map<number, RegionNode> {
    // 浅拷贝 Map，但节点需要深拷贝（因为会修改 neighbors）
    // 为了性能，这里是优化的关键点。完全克隆图太慢。
    // 通常做法是使用 Immutable 数据结构，或者记录 "Undo" 操作。
    // 考虑到 JS 性能，这里用“克隆受影响部分”的策略。
    
    const newNodes = new Map<number, RegionNode>()
    // 先复制所有节点引用
    for (const [id, node] of nodes) {
      newNodes.set(id, { ...node, neighbors: new Set(node.neighbors) })
    }

    const targetNode = newNodes.get(targetId)!
    targetNode.color = newColor

    // 查找所有现在颜色变成 newColor 的邻居，进行合并（跳过已不存在的 id，防止上一轮合并遗留的陈旧引用）
    const neighborsToMerge: number[] = []
    for (const nId of targetNode.neighbors) {
      const neighbor = newNodes.get(nId)
      if (neighbor && neighbor.color === newColor) {
        neighborsToMerge.push(nId)
      }
    }

    // 合并操作：将 neighborsToMerge 都吞并到 targetNode 中
    for (const mergeId of neighborsToMerge) {
      const mergeNode = newNodes.get(mergeId)!
      targetNode.size += mergeNode.size
      targetNode.neighbors.delete(mergeId) // 被合并的节点将从图中移除，避免后续读到已删除的 id

      // 将被合并节点的邻居转给 targetNode
      for (const deepNeighborId of mergeNode.neighbors) {
        if (deepNeighborId !== targetId) {
          targetNode.neighbors.add(deepNeighborId)
          // 反向更新：让远端邻居指向 targetId 而不是 mergeId
          const deepNeighbor = newNodes.get(deepNeighborId)!
          deepNeighbor.neighbors.delete(mergeId)
          deepNeighbor.neighbors.add(targetId)
        }
      }
      // 从图中删除被合并的节点
      newNodes.delete(mergeId)
    }

    // 清理 targetNode 自己的邻居表（不能包含自己）
    targetNode.neighbors.delete(targetId)

    return newNodes
  }

  // 辅助：生成状态指纹用于判重（可选，视性能而定）
  private serializeState(nodes: Map<number, RegionNode>): string {
    // 简单的序列化：排序后的 ID+Color 列表
    // 更好的方式可能是 Zobrist Hash
    const parts: string[] = []
    for (const node of nodes.values()) {
      parts.push(`${node.id}:${node.color}`) // 简化，实际应该包含邻接关系
    }
    return parts.sort().join('|')
  }
  
  /**
   * 将图搜索的结果转换为 GameGrid.Solution 格式（含 region 坐标与颜色字符串）
   */
  public toSolution(
    graphPath: { regionId: number; color: number }[],
    colors: readonly string[]
  ): Solution {
    return {
      steps: graphPath.length,
      path: graphPath.map(p => {
        const region = this.idToCoord.get(p.regionId) ?? { r: 0, c: 0 }
        const colorStr = colors[p.color] ?? colors[0] ?? '#fff'
        return {
          region,
          color: colorStr,
          description: `将位置(${region.r}, ${region.c})所在的区域染成 ${colorStr}`,
        }
      }),
    }
  }
}
