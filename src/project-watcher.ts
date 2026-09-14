import { watch, type ChokidarOptions, type FSWatcher } from 'chokidar'
import {
  ProjectBuildCoordinator,
  type ProjectBuildCoordinatorOptions,
  type ProjectBuildRequest,
} from './project-coordinator.js'
import type { ProjectBuildState, ProjectBuildUpdate } from './project-build.js'

export interface ProjectBuildWatcherOptions {
  paths: string | readonly string[]
  acquire: () => Promise<ProjectBuildRequest>
  debounceMs?: number
  coordinator?: ProjectBuildCoordinator
  coordinatorOptions?: ProjectBuildCoordinatorOptions
  watchOptions?: Omit<ChokidarOptions, 'ignoreInitial'>
  onUpdate?: (update: ProjectBuildUpdate) => void
  onError?: (error: unknown) => void
}

export class ProjectBuildWatcher {
  readonly #watcher: FSWatcher
  readonly #coordinator: ProjectBuildCoordinator
  readonly #acquire: () => Promise<ProjectBuildRequest>
  readonly #debounceMs: number
  readonly #onUpdate: ((update: ProjectBuildUpdate) => void) | undefined
  readonly #onError: ((error: unknown) => void) | undefined
  #started = false
  #closing = false
  #closed = false
  #dirty = false
  #timer: ReturnType<typeof setTimeout> | undefined
  #running: Promise<void> | undefined
  #closePromise: Promise<void> | undefined
  #lastError: unknown
  #lastUpdate: ProjectBuildUpdate | undefined

  private constructor(options: ProjectBuildWatcherOptions) {
    this.#coordinator =
      options.coordinator ?? new ProjectBuildCoordinator(options.coordinatorOptions)
    this.#acquire = options.acquire
    this.#debounceMs = options.debounceMs ?? 25
    this.#onUpdate = options.onUpdate
    this.#onError = options.onError
    this.#watcher = watch([...asPaths(options.paths)], {
      ...options.watchOptions,
      ignoreInitial: true,
    })
    this.#watcher.on('all', () => this.invalidate())
    this.#watcher.on('error', (error) => this.#report(error))
  }

  static async start(options: ProjectBuildWatcherOptions): Promise<ProjectBuildWatcher> {
    const project = new ProjectBuildWatcher(options)
    try {
      await watcherReady(project.#watcher)
      project.#started = true
      project.#dirty = true
      await project.#flush()
      if (project.#lastError !== undefined) throw project.#lastError
      return project
    } catch (error) {
      await project.close()
      throw error
    }
  }

  get state(): ProjectBuildState {
    return this.#coordinator.state
  }

  get lastError(): unknown {
    return this.#lastError
  }

  get lastUpdate(): ProjectBuildUpdate | undefined {
    return this.#lastUpdate
  }

  invalidate(): void {
    if (this.#closing || this.#closed) return
    this.#dirty = true
    if (this.#started) this.#schedule()
  }

  async drain(): Promise<void> {
    if (this.#timer) {
      clearTimeout(this.#timer)
      this.#timer = undefined
    }
    await this.#flush()
    await this.#coordinator.drain()
  }

  close(): Promise<void> {
    if (this.#closePromise) return this.#closePromise
    this.#closing = true
    this.#closePromise = this.#finishClose()
    return this.#closePromise
  }

  async #finishClose(): Promise<void> {
    await this.#watcher.close()
    if (this.#timer) {
      clearTimeout(this.#timer)
      this.#timer = undefined
    }
    await this.#flush()
    await this.#coordinator.drain()
    this.#closed = true
  }

  #schedule(): void {
    if (this.#timer) clearTimeout(this.#timer)
    this.#timer = setTimeout(() => {
      this.#timer = undefined
      void this.#flush()
    }, this.#debounceMs)
  }

  #flush(): Promise<void> {
    if (this.#running) return this.#running
    this.#running = this.#run().finally(() => {
      this.#running = undefined
      if (this.#dirty && !this.#closing && !this.#closed) this.#schedule()
    })
    return this.#running
  }

  async #run(): Promise<void> {
    while (this.#dirty) {
      this.#dirty = false
      try {
        const request = await this.#acquire()
        const update = await this.#coordinator.submit(request)
        this.#lastError = undefined
        this.#lastUpdate = update
        this.#emit(update)
      } catch (error) {
        this.#report(error)
      }
    }
  }

  #emit(update: ProjectBuildUpdate): void {
    try {
      this.#onUpdate?.(update)
    } catch (error) {
      this.#report(error)
    }
  }

  #report(error: unknown): void {
    this.#lastError = error
    try {
      this.#onError?.(error)
    } catch (callbackError) {
      this.#lastError = callbackError
    }
  }
}

const asPaths = (paths: string | readonly string[]): readonly string[] =>
  typeof paths === 'string' ? [paths] : paths

const watcherReady = (watcher: FSWatcher): Promise<void> =>
  new Promise((resolve, reject) => {
    const ready = (): void => {
      watcher.off('error', failed)
      resolve()
    }
    const failed = (error: unknown): void => {
      watcher.off('ready', ready)
      reject(error)
    }
    watcher.once('ready', ready)
    watcher.once('error', failed)
  })
