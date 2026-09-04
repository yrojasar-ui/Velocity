

# Velocity — Combat Specification

## 1. Purpose

This document defines the initial combat philosophy and technical requirements for Velocity.

Combat must reward mechanical skill while remaining readable and responsive.

---

# 2. Combat Pillars

Velocity combat prioritizes:

* accuracy;
* tracking;
* recoil control;
* movement;
* positioning;
* target switching;
* headshots;
* fast decision-making.

---

# 3. Combat Loop

The primary arena loop is:

```text
Spawn
↓
Acquire weapon / loadout
↓
Move
↓
Find enemy
↓
Engage
↓
Kill / Die
↓
Respawn
↓
Repeat
```

Downtime should remain minimal.

---

# 4. Weapon Architecture

Weapon behavior must be configurable.

Do not hardcode gameplay balance values throughout weapon logic.

Possible conceptual structure:

```text
WeaponDefinition
↓
WeaponInstance
↓
WeaponController
↓
Fire / Reload / ADS
```

A weapon definition may contain:

```ts
interface WeaponConfig {
    id: string;
    damage: number;
    headshotMultiplier: number;

    fireRate: number;

    magazineSize: number;
    reloadDuration: number;

    hipfireSpread: number;
    adsSpread: number;

    recoilPitch: number;
    recoilYaw: number;

    rangeStart: number;
    rangeEnd: number;
    minimumDamage: number;
}
```

Exact implementation may evolve.

---

# 5. Initial Weapons

Initial target:

## Assault Rifle

Role:

* medium range;
* general-purpose;
* tracking;
* recoil control.

The AR is the first weapon prototype and must be polished before additional weapons are implemented.

---

## SMG

Role:

* close range;
* aggressive movement;
* high fire rate.

Expected strengths:

* mobility;
* close-range damage.

Expected weaknesses:

* range;
* damage falloff.

---

## Shotgun

Role:

* very close range;
* burst damage;
* movement-based engagements.

Shotgun implementation must clearly define pellet behavior.

---

## Precision Rifle

Role:

* accurate mid/long range;
* headshot reward;
* precision.

It should not dominate all engagement distances.

---

# 6. Firing Model

Initial primary weapons should prefer hitscan where appropriate.

Benefits:

* predictable FPS gunplay;
* simpler initial networking;
* easier lag compensation;
* lower client simulation complexity.

Projectile weapons may be introduced later.

---

# 7. Fire Rate

Fire rate must be enforced consistently.

The player/client must not be able to exceed weapon RPM by sending faster input or network packets.

Future multiplayer server validation must verify:

* weapon state;
* fire cooldown;
* ammunition;
* player state.

---

# 8. Damage

Damage must be calculated from trusted gameplay configuration.

The client must never determine final damage in multiplayer.

Conceptually:

```text
Client:
"I fired weapon X in direction Y"

Server:
validate
↓
resolve hit
↓
calculate damage
↓
apply result
```

Never:

```text
Client:
"I dealt 500 damage"
```

---

# 9. Hitboxes

Initial hit regions:

* head;
* body.

Additional hit regions should only be introduced when they provide clear gameplay value.

Headshots must provide a meaningful reward.

---

# 10. TTK Philosophy

Velocity should use a medium-fast TTK.

Goals:

* aim matters;
* tracking matters;
* movement remains useful;
* reaction remains possible;
* positioning remains important.

Initial conceptual AR target:

Approximately:

```text
0.55s – 0.90s
```

under typical conditions.

This is not a final balance value.

Playtesting determines the real target.

---

# 11. Hipfire

Hipfire accuracy may vary by weapon.

Hipfire should be useful where appropriate, especially:

* SMG;
* Shotgun.

It should not automatically outperform ADS at all ranges.

---

# 12. ADS

Aim Down Sight may modify:

* FOV;
* spread;
* visual weapon position;
* recoil characteristics;
* movement speed.

ADS sensitivity must be configurable through a multiplier.

---

# 13. Recoil

Recoil must distinguish between:

### Gameplay Recoil

Changes actual aiming direction or firing behavior.

### Visual Recoil

Animation or camera feedback.

Visual recoil must not misrepresent where bullets actually travel.

The player must be able to learn and control weapon behavior.

---

# 14. Spread

Spread should be used intentionally.

Avoid excessive random spread in precision-oriented weapons.

Spread may depend on:

* hipfire;
* ADS;
* movement;
* jumping;
* weapon type.

Randomness must not overpower player skill.

---

# 15. Damage Falloff

Weapons may use distance-based damage falloff.

Example structure:

```text
full damage
↓
falloff begins
↓
damage decreases
↓
minimum damage
```

Falloff parameters must be defined by weapon configuration.

---

# 16. Ammunition

Initial weapon state:

```text
magazine ammunition
reserve ammunition
```

Reload must not complete immediately.

Reload timing must be server-validatable in multiplayer.

---

# 17. Reload

Reload states should be explicit.

Possible:

```text
Ready
Firing
Reloading
ADS
```

Invalid operations must be controlled.

Example:

A weapon should not simultaneously complete contradictory states because multiple inputs were processed incorrectly.

---

# 18. Weapon Switching

Not required for the first AR prototype.

When introduced, switching must have:

* configurable timing;
* clear state transition;
* no duplication exploits;
* no reload bypass exploits.

---

# 19. Feedback

Successful firing should provide layered feedback.

Possible systems:

* muzzle flash;
* weapon animation;
* firing sound;
* recoil;
* impact effect;
* hitmarker;
* headshot feedback;
* damage indicator.

Feedback should remain readable rather than excessive.

---

# 20. Hitmarkers

Initial states:

```text
normal hit
headshot
kill
```

Hitmarkers must not be shown unless the authoritative combat result confirms the hit in multiplayer.

---

# 21. Health

Initial system:

```text
maximum health
current health
damage
death
respawn
```

Armor may be evaluated later.

It is not required for initial combat.

---

# 22. Death

On death:

* movement stops;
* combat actions stop;
* death state begins;
* score is updated;
* respawn timer begins.

The system must prevent duplicate death processing.

---

# 23. Respawn

Arena respawn should remain short.

Spawn logic must eventually evaluate:

* enemy proximity;
* line of sight;
* spawn safety;
* recent spawn usage.

Initial prototype respawning may use simpler rules.

---

# 24. Score

Initial 1v1 development mode:

Possible target:

```text
First to 20 kills
```

or time-limited scoring.

Exact game-mode rules remain configurable.

---

# 25. Multiplayer Authority

The future server is authoritative for:

* damage;
* kills;
* player health;
* ammunition validation;
* fire-rate validation;
* weapon state;
* match score;
* respawn state.

The client is responsible for:

* local input;
* immediate presentation;
* prediction;
* visual feedback.

---

# 26. Client Prediction

To maintain responsive gunplay, local presentation may happen immediately.

Example:

```text
click
↓
local recoil
local muzzle flash
local sound
↓
request sent to server
↓
authoritative result
```

The client must not permanently determine the combat result.

---

# 27. Lag Compensation

Future hitscan multiplayer should support server-side lag compensation where technically appropriate.

The server may maintain historical player positions for a short time window.

Concept:

```text
shot timestamp
↓
rewind target state
↓
validate shot
↓
restore current simulation
```

Exact implementation will be designed during multiplayer development.

---

# 28. Anti-Cheat Principles

Never trust client claims for:

* damage;
* ammunition;
* fire rate;
* health;
* score;
* weapon ownership;
* impossible movement state.

Server validation is mandatory.

---

# 29. Combat Debug Tools

Combat Lab should display:

* current weapon;
* ammo;
* fire rate;
* shots fired;
* hits;
* accuracy;
* damage;
* headshots;
* target health;
* estimated TTK.

Optional:

* hitbox visualization;
* ray visualization;
* recoil plots.

---

# 30. Dummy Targets

Initial combat test environment requires:

### Static Dummy

Used for:

* recoil;
* accuracy;
* hit detection;
* damage.

### Moving Dummy

Used for:

* tracking;
* TTK;
* target switching;
* movement interactions.

---

# 31. Initial Destruction Interaction

Weapons may eventually interact with destructible materials.

Possible material categories:

```text
Glass
Wood
WeakWall
Metal
Indestructible
```

Each material may define:

* health;
* penetration behavior;
* destruction threshold.

This system is not required before the core weapon sandbox is stable.

---

# 32. Initial Non-Goals

Not required for the first combat milestone:

* explosives;
* grenades;
* melee systems;
* abilities;
* armor tiers;
* loot rarity;
* attachments;
* weapon crafting;
* vehicles;
* dozens of weapons.

---

# 33. M2 Acceptance Criteria

The AR prototype must support:

* fire;
* hitscan;
* fire-rate enforcement;
* magazine;
* reload;
* ADS;
* hipfire;
* recoil;
* headshots;
* damage;
* hitmarkers;
* dummy targets.

The weapon must feel satisfying before additional weapons are implemented.

---

# 34. M3 Acceptance Criteria

Combat sandbox must support:

* four weapon archetypes;
* health;
* death;
* respawn;
* score;
* kill feed;
* repeatable combat loop.

The primary acceptance criterion is:

> Players should want to immediately continue fighting after a kill or death.
