import { Vec3 } from "playcanvas";

import { MovementState, type TraversalMovementState } from "./MovementState";
import type { MovementConfig } from "./movementConfig";
import {
  evaluateTraversalPath,
  type TraversalPath,
  type Vector3Value,
} from "./traversalMath";

export interface TraversalCandidate {
  readonly kind: TraversalMovementState;
  readonly obstacleHeight: number;
  readonly obstacleDepth: number | null;
  readonly topPoint: Readonly<Vec3>;
  readonly path: Readonly<TraversalPath>;
}

export interface TraversalStep {
  readonly position: Vec3;
  readonly completed: boolean;
}

interface ActiveTraversalPath extends TraversalPath {
  kind: TraversalMovementState;
  clearanceCenterY: number;
}

export class TraversalController {
  private readonly startPosition = new Vec3();
  private readonly targetPosition = new Vec3();
  private readonly desiredPosition = new Vec3();
  private readonly exitVelocity = new Vec3();
  private readonly activePath: ActiveTraversalPath = {
    kind: MovementState.Mantle,
    start: this.startPosition,
    target: this.targetPosition,
    clearanceCenterY: 0,
  };
  private readonly step: { position: Vec3; completed: boolean } = {
    position: this.desiredPosition,
    completed: false,
  };
  private active = false;
  private elapsedSeconds = 0;
  private durationSeconds = 0;
  private currentProgress = 0;

  public constructor(private readonly config: Readonly<MovementConfig>) {}

  public get isActive(): boolean {
    return this.active;
  }

  public get kind(): TraversalMovementState | null {
    return this.active ? this.activePath.kind : null;
  }

  public get progress(): number {
    return this.currentProgress;
  }

  public get elapsed(): number {
    return this.elapsedSeconds;
  }

  public get exitLinearVelocity(): Readonly<Vec3> {
    return this.exitVelocity;
  }

  public start(
    candidate: Readonly<TraversalCandidate>,
    entryVelocity: Readonly<Vector3Value>,
  ): boolean {
    if (this.active) {
      return false;
    }

    this.startPosition.set(
      candidate.path.start.x,
      candidate.path.start.y,
      candidate.path.start.z,
    );
    this.targetPosition.set(
      candidate.path.target.x,
      candidate.path.target.y,
      candidate.path.target.z,
    );
    this.activePath.kind = candidate.kind;
    this.activePath.clearanceCenterY = candidate.path.clearanceCenterY;
    this.desiredPosition.copy(this.startPosition);
    this.exitVelocity.set(entryVelocity.x, 0, entryVelocity.z);
    this.elapsedSeconds = 0;
    this.currentProgress = 0;
    this.durationSeconds =
      candidate.kind === MovementState.Vault
        ? this.config.vaultDurationSeconds
        : this.config.mantleDurationSeconds;
    this.active = true;
    this.step.completed = false;
    return true;
  }

  public advance(deltaTimeSeconds: number): Readonly<TraversalStep> {
    if (!this.active) {
      this.step.completed = false;
      return this.step;
    }

    this.elapsedSeconds = Math.min(
      this.durationSeconds,
      this.elapsedSeconds + Math.max(0, deltaTimeSeconds),
    );
    this.currentProgress =
      this.durationSeconds <= 0
        ? 1
        : this.elapsedSeconds / this.durationSeconds;
    evaluateTraversalPath(
      this.activePath,
      this.currentProgress,
      this.desiredPosition,
    );
    this.step.completed = this.currentProgress >= 1;
    if (this.step.completed) {
      this.active = false;
    }

    return this.step;
  }

  public reset(): void {
    this.active = false;
    this.elapsedSeconds = 0;
    this.durationSeconds = 0;
    this.currentProgress = 0;
    this.exitVelocity.set(0, 0, 0);
    this.step.completed = false;
  }
}
