import { MovementState } from "./MovementState";

export type GroundedMovementState = Exclude<
  MovementState,
  MovementState.Airborne
>;

export class JumpForgivenessController {
  private coyoteSecondsRemaining = 0;
  private jumpBufferSecondsRemaining = 0;
  private departureSource: GroundedMovementState | null = null;

  public constructor(
    private readonly coyoteTimeSeconds: number,
    private readonly jumpBufferTimeSeconds: number,
  ) {}

  public get coyoteActive(): boolean {
    return this.coyoteSecondsRemaining > 0;
  }

  public get jumpBufferActive(): boolean {
    return this.jumpBufferSecondsRemaining > 0;
  }

  public get coyoteSource(): GroundedMovementState | null {
    return this.departureSource;
  }

  public get coyoteTimeRemaining(): number {
    return this.coyoteSecondsRemaining;
  }

  public get jumpBufferTimeRemaining(): number {
    return this.jumpBufferSecondsRemaining;
  }

  public advance(deltaTime: number): void {
    const elapsedSeconds = Math.max(0, deltaTime);
    this.coyoteSecondsRemaining = Math.max(
      0,
      this.coyoteSecondsRemaining - elapsedSeconds,
    );
    this.jumpBufferSecondsRemaining = Math.max(
      0,
      this.jumpBufferSecondsRemaining - elapsedSeconds,
    );

    if (!this.coyoteActive) {
      this.departureSource = null;
    }
  }

  public recordJumpPress(): void {
    this.jumpBufferSecondsRemaining = this.jumpBufferTimeSeconds;
  }

  public armCoyote(source: GroundedMovementState): void {
    this.departureSource = source;
    this.coyoteSecondsRemaining = this.coyoteTimeSeconds;
  }

  public clearCoyote(): void {
    this.coyoteSecondsRemaining = 0;
    this.departureSource = null;
  }

  public getEffectiveJumpSource(
    currentState: MovementState,
  ): GroundedMovementState | null {
    if (!this.jumpBufferActive) {
      return null;
    }

    if (currentState !== MovementState.Airborne) {
      return currentState;
    }

    return this.coyoteActive ? this.departureSource : null;
  }

  public consumeJumpRequest(): void {
    this.jumpBufferSecondsRemaining = 0;
    this.clearCoyote();
  }

  public reset(): void {
    this.consumeJumpRequest();
  }
}
