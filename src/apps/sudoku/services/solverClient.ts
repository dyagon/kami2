import type { Grid, SolverResult } from '../types/sudoku'

interface WorkerSuccessPayload {
  status: 'success' | 'unsolvable' | 'timeout'
  solution?: Grid
}

export class SolverClient {
  private activeWorker: Worker | null = null

  private activeTimeout: number | null = null

  solve(grid: Grid, timeoutMs: number): Promise<SolverResult> {
    this.cancel()

    return new Promise((resolve) => {
      const worker = new Worker(new URL('../workers/solver.worker.ts', import.meta.url), {
        type: 'module',
      })
      this.activeWorker = worker

      const finalize = (result: SolverResult) => {
        if (this.activeTimeout !== null) {
          window.clearTimeout(this.activeTimeout)
          this.activeTimeout = null
        }
        worker.terminate()
        if (this.activeWorker === worker) {
          this.activeWorker = null
        }
        resolve(result)
      }

      this.activeTimeout = window.setTimeout(() => {
        finalize({ status: 'timeout' })
      }, timeoutMs)

      worker.onerror = () => {
        finalize({ status: 'unsolvable' })
      }

      worker.onmessage = (event: MessageEvent<WorkerSuccessPayload>) => {
        if (event.data.status === 'success' && event.data.solution) {
          finalize({ status: 'success', solution: event.data.solution })
          return
        }

        if (event.data.status === 'timeout') {
          finalize({ status: 'timeout' })
          return
        }

        finalize({ status: 'unsolvable' })
      }

      worker.postMessage({ grid, timeoutMs })
    })
  }

  cancel() {
    if (this.activeWorker) {
      this.activeWorker.terminate()
      this.activeWorker = null
    }

    if (this.activeTimeout !== null) {
      window.clearTimeout(this.activeTimeout)
      this.activeTimeout = null
    }
  }
}
