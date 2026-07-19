import fs from "fs/promises";
import type { Logger } from './logger.js'
import { parseSql } from './ast.js';

function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${value}`);
}

type QueryFilesystemEvent = {
  ts: Date;
  path: string;
  action: "added" | "modified" | "deleted";
  type: "query";
};

type MigrationAddedFilesystemEvent = {
  ts: Date;
  path: string;
  action: "added";
  type: "migration";
};

type MigrationModifiedFilesystemEvent = {
  ts: Date;
  path: string;
  action: "modified";
  type: "migration";
};

type MigrationDeletedFilesystemEvent = {
  ts: Date;
  path: string;
  action: "deleted";
  type: "migration";
};

type MigrationFilesystemEvent = MigrationAddedFilesystemEvent | MigrationModifiedFilesystemEvent | MigrationDeletedFilesystemEvent;

type MigrationsReadyFilesystemEvent = {
  ts: Date;
  type: "migrations";
  action: "ready";
};

type SyntheticRetryEvent = {
  ts: Date;
  type: "synthetic-retry";
  error: any;
};

type IngestedEvent = MigrationFilesystemEvent | QueryFilesystemEvent | MigrationsReadyFilesystemEvent;

type DatabaseIdentifier = {
  schema: string;
  table: string;
  column?: string;
};

class EngineError extends Error {};
class EventConsumptionError extends EngineError {};
class MigrationsReadyEventAlreadyReceivedError extends EventConsumptionError {};


class MigrationsReadyEventNotYetReceivedError extends EventConsumptionError {
  event: MigrationModifiedFilesystemEvent | MigrationDeletedFilesystemEvent;
  constructor(event: MigrationModifiedFilesystemEvent | MigrationDeletedFilesystemEvent) {
    super(`Cause: ${event.path} ${event.action}`);
    this.event = event;
  }
};

class MigrationNotTrackedError extends EventConsumptionError {
  event: MigrationModifiedFilesystemEvent | MigrationDeletedFilesystemEvent;
  
  constructor(event: MigrationModifiedFilesystemEvent | MigrationDeletedFilesystemEvent) {
    super(`Tried applying ${event.action} to migration that is not tracked: ${event.path}`);
    this.event = event;
  }
}

class MigrationAlreadyTrackedError extends EventConsumptionError {
  event: MigrationAddedFilesystemEvent;
  constructor(event: MigrationAddedFilesystemEvent) {
    super(`Migration already tracked: ${event.path}`);
    this.event = event;
  }
}

class QueryTrackerAlreadyExistsError extends EventConsumptionError {
  constructor(query: string) {
    super(`Query tracker already exists for query: ${query}`);
  }
};

const createSubscriptionMap = () => {
  const subscriptions: Map<string, Set<QueryTracker>> = new Map();

  const getKey = (identifier: DatabaseIdentifier) => {
    return JSON.stringify([identifier.schema, identifier.table, identifier.column]);
  };

  return {
    subscribe(identifier: DatabaseIdentifier, qt: QueryTracker) {
      const key = getKey(identifier);
      const set = subscriptions.get(key) || new Set();
      set.add(qt);
      subscriptions.set(key, set);
    },
    unsubscribe(identifier: DatabaseIdentifier, qt: QueryTracker) {
      const key = getKey(identifier);
      const set = subscriptions.get(key) || new Set();
      set.delete(qt);
      if (set.size === 0) {
        subscriptions.delete(key);
      }
    },
  };
}

class QueryTracker {
  private engine: Engine;
  private path: string;

  constructor(engine: Engine, path: string) {
    this.engine = engine;
    this.path = path;
  }

  pushEvent(event: QueryFilesystemEvent) {
  }

  async track() {

  }
}

type PromiseResolution<T> = { resolve: (value: T) => void; reject: (reason?: any) => void };
type DestructuredPromise<T> = { promise: Promise<T>; resolution: PromiseResolution<T> };

const createDestructuredPromise = <T>(): DestructuredPromise<T> => {
  let resolution!: PromiseResolution<T>;
  const promise = new Promise<T>((resolve, reject) => {
    resolution = { resolve, reject };
  });
  return { promise, resolution };
}

class MigrationTracker {
  private debounce?: number;

  private migrationsTracker: MigrationsTracker;
  private lastFilesystemReadAt: Date | null = null;
  private path: string;

  // event that is up for processing
  private pendingEvent: MigrationModifiedFilesystemEvent | MigrationAddedFilesystemEvent | SyntheticRetryEvent | null = null;
  // event that is either being currently processed or the last processed one
  private lastProcessedEvent: MigrationModifiedFilesystemEvent | MigrationAddedFilesystemEvent | SyntheticRetryEvent | null = null;
  
  private _eventReceivedPromise: Promise<void>;
  private _eventReceivedPromiseResolution!: PromiseResolution<void>;

  private _runPromise: Promise<void> | null = null;
  private _scheduledSyntheticRetryEventPushTimeoutHandle: NodeJS.Timeout | null = null;
  private syntheticRetryEventPushInterval: number;

  private logger: Logger;

  constructor({ 
    migrationsTracker, 
    addedEvent,
    logger,
    syntheticRetryEventPushInterval = 1000,
    debounce,
  }: { 
    migrationsTracker: MigrationsTracker, 
    addedEvent: MigrationAddedFilesystemEvent, 
    logger: Logger,
    syntheticRetryEventPushInterval?: number,
    debounce?: number,
  }) {
    this.migrationsTracker = migrationsTracker;
    this.path = addedEvent.path;
    this.logger = logger;
    const { promise, resolution } = createDestructuredPromise<void>();
    this._eventReceivedPromise = promise;
    this._eventReceivedPromiseResolution = resolution;
    this._setAndNotify(addedEvent);
    this.syntheticRetryEventPushInterval = syntheticRetryEventPushInterval;
    this.debounce = debounce;
  }

  private _setAndNotify(event: MigrationModifiedFilesystemEvent | MigrationAddedFilesystemEvent | SyntheticRetryEvent) {
    this.pendingEvent = event;
    this._eventReceivedPromiseResolution.resolve();
  }

  private _scheduleSyntheticRetryEventPush(error: any) {
    if (this._scheduledSyntheticRetryEventPushTimeoutHandle !== null) {
      clearTimeout(this._scheduledSyntheticRetryEventPushTimeoutHandle);
      this._scheduledSyntheticRetryEventPushTimeoutHandle = null;
    }
    this._scheduledSyntheticRetryEventPushTimeoutHandle = setTimeout(() => {
      this._scheduledSyntheticRetryEventPushTimeoutHandle = null;
      this.pushEvent({
        ts: new Date(),
        type: "synthetic-retry",
        error,
      });
    }, this.syntheticRetryEventPushInterval);
  }

  pushEvent(event: MigrationModifiedFilesystemEvent | SyntheticRetryEvent) {
    const { pendingEvent, lastProcessedEvent } = this;
    if (pendingEvent !== null) {
      // pending event is expected to always be fresher than the last processed one,
      // this is why this branch goes first
      if (event.ts > pendingEvent.ts) {
        // swap the pending event with the newer one
        this._setAndNotify(event);
      } else {
        this.logger.debug("NOTICE: Received an event, but the pending event is newer, ignoring", {
          event,
          pendingEvent,
        });
      }
    } else if (lastProcessedEvent !== null) {
      if (event.ts > lastProcessedEvent.ts) {
        if (this.lastFilesystemReadAt !== null) {
          if (event.ts > this.lastFilesystemReadAt) {
            // we have already read the filesystem, so we need to notify only if the event is newer than the latest filesystem read
            this._setAndNotify(event);
          } else {
            this.logger.debug("NOTICE: Received an event, but the event is older than the latest filesystem read, ignoring", {
              event,
              lastFilesystemReadAt: this.lastFilesystemReadAt,
            });
          }
        } else {
          // we have not read the filesystem yet, so we need to notify
          this._setAndNotify(event);
        }
      } else {
        this.logger.debug("NOTICE: Received an event, but the last processed event is newer (pending is not set), ignoring", {
          event,
          lastProcessedEvent,
        });
      }
    } else {
      // this shouldn't happen: there is no pending event and no last processed one
      this.logger.debug("NOTICE: Received an event, but there is no pending event and no last processed one, ignoring", {
        event,
      });
    }
  }

  private async _readOrScheduleSyntheticRetryEvent() {
    // pessimistically timestamp the read
    this.lastFilesystemReadAt = new Date();
    try {
      const content = await fs.readFile(this.path, "utf8");
      return content;
    } catch (error) {
      this.logger.error("ERROR: Failed to read migration file", {
        path: this.path,
        error,
      });
      // this may be a temporary error
      this._scheduleSyntheticRetryEventPush(error);
    }
    return undefined;
  }

  private _prepareIteration() {
    /**
     * this is synchronous logic, so no context switch is possible
     * so this is performed atomically from the PoV of asynchronous observers
     */
    // cancel any scheduled synthetic retry event push
    if (this._scheduledSyntheticRetryEventPushTimeoutHandle !== null) {
      clearTimeout(this._scheduledSyntheticRetryEventPushTimeoutHandle);
      this._scheduledSyntheticRetryEventPushTimeoutHandle = null;
    }
    // swap out the promise
    const { promise, resolution } = createDestructuredPromise<void>();
    this._eventReceivedPromise = promise;
    this._eventReceivedPromiseResolution = resolution;
    // get the pending event
    const event = this.pendingEvent;
    if (event === null) {
      // this shouldn't happen: every notification should set the pending event
      this.logger.error("INTERNAL ERROR: No pending event to process");
      return false;
    }
    // clear the pending event
    this.pendingEvent = null;
    // set the last processed event (currently processing this one)
    this.lastProcessedEvent = event;
    return true;
  }

  private async _run() {
    while (true) {
      await this._eventReceivedPromise;
      if (!this._prepareIteration()) continue;
      if (this.debounce) {
        await new Promise(resolve => setTimeout(resolve, this.debounce));
        // skip handling the current event, since a fresher one has popped up
        if (this.pendingEvent) continue;
      }
      const content = await this._readOrScheduleSyntheticRetryEvent();
      if (!content) continue;
      
      const result = await parseSql(content);

      
    }
  }

  start() {
    if (this._runPromise !== null) return;
    this._runPromise = this._run();
  }

  stop() {

  }
}

class MigrationsTracker {
  private engine: Engine;
  private logger: Logger;
  private _readyEventReceived: boolean = false;
  private _readyEventPromise: Promise<MigrationsReadyFilesystemEvent>;
  private _readyEventPromiseResolution!: {
    resolve: (event: MigrationsReadyFilesystemEvent) => void;
    reject: (reason?: any) => void;
  };
  private _readyEvent?: MigrationsReadyFilesystemEvent;
  private migrationTrackers: Map<string, MigrationTracker> = new Map();

  constructor({ engine, logger }: { engine: Engine, logger: Logger }) {
    this.engine = engine;
    this.logger = logger;
    this._readyEventPromise = new Promise<MigrationsReadyFilesystemEvent>((resolve, reject) => {
      this._readyEventPromiseResolution = { resolve, reject };
    });
  }

  pushEvent(event: MigrationFilesystemEvent | MigrationsReadyFilesystemEvent) {
    if (event.type === "migrations") {
      if (event.action === "ready") {
        this._readyEvent = event;
        this._readyEventPromiseResolution.resolve(event);
        this._readyEventReceived = true;
      } else {
        assertNever(event);
      }
    } else if (event.type === "migration") {
      if (event.action === "added") {
        if (this.migrationTrackers.has(event.path)) {
          throw new MigrationAlreadyTrackedError(event);
        }
        const migrationTracker = new MigrationTracker({
          migrationsTracker: this,
          addedEvent: event,
          logger: this.logger,
          // TODO: make these configurable
          syntheticRetryEventPushInterval: 1000,
          debounce: 100,
        });
        this.migrationTrackers.set(event.path, migrationTracker);
        migrationTracker.start();
      } else if (event.action === "modified") {
        if (!this._readyEventReceived) {
          throw new MigrationsReadyEventNotYetReceivedError(event);
        }
        const migrationTracker = this.migrationTrackers.get(event.path);
        if (!migrationTracker) {
          throw new MigrationNotTrackedError(event);
        }
        migrationTracker.pushEvent(event);
      } else if (event.action === "deleted") {
        if (!this._readyEventReceived) {
          throw new MigrationsReadyEventNotYetReceivedError(event);
        }
        const migrationTracker = this.migrationTrackers.get(event.path);
        if (!migrationTracker) {
          throw new MigrationNotTrackedError(event);
        }
        this.migrationTrackers.delete(event.path);
        migrationTracker.stop();
      } else {
        assertNever(event);
      }
    } else {
      assertNever(event);
    }
  }

  get isReadyEventReceived() {
    return this._readyEventReceived;
  }

  get waitForReadyEvent() {
    return this._readyEventPromise;
  }

  get readyEvent() {
    return this._readyEvent;
  }

  async track() {

  }
}

class Engine {
  private subscriptionMap: ReturnType<typeof createSubscriptionMap>;
  private migrationsTracker: MigrationsTracker;
  private queryTrackers: Map<string, QueryTracker> = new Map();
  private logger: Logger;
  

  constructor({ logger }: { logger: Logger }) {
    this.subscriptionMap = createSubscriptionMap();
    this.migrationsTracker = new MigrationsTracker({
      engine: this,
      logger: logger,
    });
    this.logger = logger;
  }

  pushEvent(event: IngestedEvent) {
    if (event.type === "migrations" || event.type === "migration") {
      this.migrationsTracker.pushEvent(event);
    } else {
  
    }
  }

}