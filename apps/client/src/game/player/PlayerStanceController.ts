import {
  Entity,
  Vec3,
  type CollisionComponent,
  type RigidBodyComponent,
} from "playcanvas";

import type { MovementConfig } from "./movementConfig";
import {
  getCapsuleCenterHeightDelta,
  getCountertranslatedCameraHeight,
  moveTowards,
} from "./stanceMath";

export class PlayerStanceController {
  private readonly preservedLinearVelocity = new Vec3();
  private readonly preservedAngularVelocity = new Vec3();
  private readonly nextPosition = new Vec3();
  private physicallyCrouched = false;

  public constructor(
    private readonly player: Entity,
    private readonly collision: CollisionComponent,
    private readonly rigidBody: RigidBodyComponent,
    private readonly cameraPivot: Entity,
    private readonly config: Readonly<MovementConfig>,
  ) {
    if (config.crouchHeight < config.playerRadius * 2) {
      throw new Error("Crouch height must fit the player capsule diameter.");
    }
  }

  public get isCrouched(): boolean {
    return this.physicallyCrouched;
  }

  public get height(): number {
    return this.collision.height;
  }

  public get cameraHeight(): number {
    return this.cameraPivot.getLocalPosition().y;
  }

  public update(
    crouchRequired: boolean,
    standClear: boolean,
    deltaTime: number,
  ): void {
    if (crouchRequired && !this.physicallyCrouched) {
      this.applyHeight(this.config.crouchHeight, true);
    } else if (!crouchRequired && this.physicallyCrouched && standClear) {
      this.applyHeight(this.config.playerHeight, false);
    }

    this.updateCamera(deltaTime);
  }

  public prepareForReset(): void {
    if (this.physicallyCrouched) {
      this.applyHeight(this.config.playerHeight, false);
    }

    const cameraPosition = this.cameraPivot.getLocalPosition();
    this.cameraPivot.setLocalPosition(
      cameraPosition.x,
      this.config.cameraEyeHeight,
      cameraPosition.z,
    );
  }

  private applyHeight(nextHeight: number, crouched: boolean): void {
    const currentHeight = this.collision.height;
    const centerHeightDelta = getCapsuleCenterHeightDelta(
      currentHeight,
      nextHeight,
    );
    const cameraPosition = this.cameraPivot.getLocalPosition();
    this.preservedLinearVelocity.copy(this.rigidBody.linearVelocity);
    this.preservedAngularVelocity.copy(this.rigidBody.angularVelocity);
    this.nextPosition.copy(this.player.getPosition());
    this.nextPosition.y += centerHeightDelta;
    this.cameraPivot.setLocalPosition(
      cameraPosition.x,
      getCountertranslatedCameraHeight(cameraPosition.y, centerHeightDelta),
      cameraPosition.z,
    );

    this.rigidBody.teleport(this.nextPosition);
    this.collision.height = nextHeight;
    this.rigidBody.linearVelocity = this.preservedLinearVelocity;
    this.rigidBody.angularVelocity = this.preservedAngularVelocity;
    this.rigidBody.activate();
    this.physicallyCrouched = crouched;
  }

  private updateCamera(deltaTime: number): void {
    const cameraPosition = this.cameraPivot.getLocalPosition();
    const targetHeight = this.physicallyCrouched
      ? this.config.crouchCameraEyeHeight
      : this.config.cameraEyeHeight;
    const nextHeight = moveTowards(
      cameraPosition.y,
      targetHeight,
      this.config.crouchCameraTransitionSpeed * Math.max(0, deltaTime),
    );

    if (nextHeight === cameraPosition.y) {
      return;
    }

    this.cameraPivot.setLocalPosition(
      cameraPosition.x,
      nextHeight,
      cameraPosition.z,
    );
  }
}
