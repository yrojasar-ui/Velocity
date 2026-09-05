import { Vec3, type RigidBodyComponent } from "playcanvas";

export class MovementLabControls {
  private readonly spawnPosition = new Vec3();
  private readonly zeroVelocity = new Vec3();

  public constructor(
    private readonly telemetryElement: HTMLElement,
    private readonly rigidBody: RigidBodyComponent,
    spawnPosition: Readonly<Vec3>,
  ) {
    this.spawnPosition.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
    window.addEventListener("keydown", this.handleKeyDown);
  }

  public destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (event.code === "F3") {
      event.preventDefault();
      this.telemetryElement.hidden = !this.telemetryElement.hidden;
      return;
    }

    if (event.code === "KeyR") {
      event.preventDefault();
      this.rigidBody.teleport(this.spawnPosition);
      this.rigidBody.linearVelocity = this.zeroVelocity;
      this.rigidBody.angularVelocity = this.zeroVelocity;
    }
  };
}
