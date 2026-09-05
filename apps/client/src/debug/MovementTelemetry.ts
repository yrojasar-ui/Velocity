import type { Entity, RigidBodyComponent } from "playcanvas";

import type { PointerLock } from "../core/input/PointerLock";
import { MovementState } from "../game/player/MovementState";
import type { MovementStateController } from "../game/player/MovementStateController";
import type { PlayerLook } from "../game/player/PlayerLook";

const REFRESH_INTERVAL_SECONDS = 0.1;

export class MovementTelemetry {
  private elapsedSeconds = 0;
  private elapsedFrames = 0;

  public constructor(
    private readonly element: HTMLElement,
    private readonly player: Entity,
    private readonly rigidBody: RigidBodyComponent,
    private readonly movementState: MovementStateController,
    private readonly look: PlayerLook,
    private readonly pointerLock: PointerLock,
  ) {}

  public update(deltaTime: number): void {
    this.elapsedSeconds += deltaTime;
    this.elapsedFrames += 1;

    if (this.elapsedSeconds < REFRESH_INTERVAL_SECONDS) {
      return;
    }

    const position = this.player.getPosition();
    const velocity = this.rigidBody.linearVelocity;
    const fps = this.elapsedFrames / this.elapsedSeconds;
    const frameTimeMilliseconds =
      (this.elapsedSeconds / this.elapsedFrames) * 1000;
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    const currentMovementState = this.movementState.current;
    const grounded = currentMovementState === MovementState.Grounded;

    this.element.textContent = [
      `FPS: ${fps.toFixed(0)}`,
      `Frame time: ${frameTimeMilliseconds.toFixed(2)} ms`,
      `Position: ${formatVector(position.x, position.y, position.z)}`,
      `Velocity: ${formatVector(velocity.x, velocity.y, velocity.z)}`,
      `Horizontal speed: ${horizontalSpeed.toFixed(2)} m/s`,
      `Vertical speed: ${velocity.y.toFixed(2)} m/s`,
      `Movement state: ${currentMovementState}`,
      `Grounded: ${grounded ? "yes" : "no"}`,
      `Pointer Lock: ${this.pointerLock.mode}`,
      `Look: yaw ${this.look.yaw.toFixed(1)}°, pitch ${this.look.pitch.toFixed(1)}°`,
    ].join("\n");

    this.element.dataset.movementState = currentMovementState;
    this.element.dataset.grounded = String(grounded);
    this.element.dataset.pointerLock = this.pointerLock.mode;
    this.elapsedSeconds = 0;
    this.elapsedFrames = 0;
  }
}

function formatVector(x: number, y: number, z: number): string {
  return `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`;
}
