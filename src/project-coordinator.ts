import { applyProjectBuildEvents } from './artifact-writer.js'
import {
  EMPTY_PROJECT_BUILD_STATE,
  reconcileProjectBuild,
  type ProjectBuildEvent,
  type ProjectBuildState,
  type ProjectBuildUpdate,
  type ReconcileProjectBuildOptions,
} from './project-build.js'
import type { QuerySourceInput } from './query-batch.js'

export interface ProjectBuildRequest {
  sources: readonly QuerySourceInput[]
  options: ReconcileProjectBuildOptions
}

export interface ProjectBuildCoordinatorOptions {
  initialState?: ProjectBuildState
  apply?: (events: readonly ProjectBuildEvent[]) => Promise<void>
}

interface PendingBuild {
  request: ProjectBuildRequest
  waiters: BuildWaiter[]
}

interface BuildWaiter {
  resolve: (update: ProjectBuildUpdate) => void
  reject: (error: unknown) => void
}

export class ProjectBuildCoordinator {
  #state: ProjectBuildState
  #apply: (events: readonly ProjectBuildEvent[]) => Promise<void>
  #pending: PendingBuild | undefined
  #running = false
  #drainWaiters: (() => void)[] = []

  constructor(options: ProjectBuildCoordinatorOptions = {}) {
    this.#state = options.initialState ?? EMPTY_PROJECT_BUILD_STATE
    this.#apply = options.apply ?? applyEvents
  }

  get state(): ProjectBuildState {
    return this.#state
  }

  submit(request: ProjectBuildRequest): Promise<ProjectBuildUpdate> {
    const promise = new Promise<ProjectBuildUpdate>((resolve, reject) => {
      const waiter = { resolve, reject }
      if (this.#pending) {
        this.#pending.request = request
        this.#pending.waiters.push(waiter)
      } else {
        this.#pending = { request, waiters: [waiter] }
      }
    })
    if (!this.#running) void this.#run()
    return promise
  }

  drain(): Promise<void> {
    if (!this.#running && !this.#pending) return Promise.resolve()
    return new Promise((resolve) => this.#drainWaiters.push(resolve))
  }

  async #run(): Promise<void> {
    this.#running = true
    while (this.#pending) {
      const pending = this.#pending
      this.#pending = undefined
      try {
        const update = await reconcileProjectBuild(
          pending.request.sources,
          pending.request.options,
          this.#state,
        )
        await this.#apply(update.events)
        this.#state = update.state
        for (const waiter of pending.waiters) waiter.resolve(update)
      } catch (error) {
        for (const waiter of pending.waiters) waiter.reject(error)
      }
    }
    this.#running = false
    for (const resolve of this.#drainWaiters.splice(0)) resolve()
  }
}

const applyEvents = async (events: readonly ProjectBuildEvent[]): Promise<void> => {
  await applyProjectBuildEvents(events)
}
