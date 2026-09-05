export interface MovementConfig {
  readonly walkSpeed: number;
  readonly groundAcceleration: number;
  readonly groundDeceleration: number;
  readonly gravity: number;
  readonly jumpVelocity: number;
  readonly degreesPerMouseCount: number;
  readonly maxLookPitchDegrees: number;
  readonly playerHeight: number;
  readonly playerRadius: number;
  readonly playerMass: number;
  readonly playerFriction: number;
  readonly playerRestitution: number;
  readonly cameraEyeHeight: number;
  readonly cameraFovDegrees: number;
  readonly groundProbeDistance: number;
  readonly minimumGroundNormalY: number;
  readonly maximumGroundedUpwardVelocity: number;
}

export const movementConfig: Readonly<MovementConfig> = Object.freeze({
  walkSpeed: 6,
  groundAcceleration: 30,
  groundDeceleration: 24,
  gravity: -24,
  jumpVelocity: 8,
  degreesPerMouseCount: 0.1,
  maxLookPitchDegrees: 89,
  playerHeight: 1.8,
  playerRadius: 0.4,
  playerMass: 80,
  playerFriction: 0,
  playerRestitution: 0,
  cameraEyeHeight: 0.65,
  cameraFovDegrees: 75,
  groundProbeDistance: 0.18,
  minimumGroundNormalY: 0.7,
  maximumGroundedUpwardVelocity: 0.1,
});
