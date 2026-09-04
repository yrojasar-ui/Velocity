Velocity — Development Roadmap
Project Rule

A phase is not completed because code exists.

A phase is completed when its acceptance criteria are satisfied.

Phase 0 — Preproduction
Goal

Establish the product and engineering direction before implementing gameplay.

Deliverables
GAME_VISION.md
ARCHITECTURE.md
SECURITY.md
CODING_STANDARDS.md
ROADMAP.md
MOVEMENT_SPEC.md
COMBAT_SPEC.md
Exit Criteria
initial game scope defined;
technical stack defined;
non-goals documented;
coding standards documented;
security rules documented;
architecture documented.
Phase 1 — Foundation
Goal

Create a stable engineering foundation.

Tasks
initialize monorepo;
configure TypeScript;
enable strict mode;
configure Vite;
integrate PlayCanvas;
configure ESLint;
configure Prettier;
configure tests;
configure GitHub Actions;
configure development build;
configure production build;
create debug tools.
Required Commands
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
npm run format
npm run format:check
Exit Criteria

All mandatory commands pass.

The client can:

load a PlayCanvas scene;
render successfully;
run without console errors.
Milestone M0 — WALK
Goal

Create the minimum technically correct FPS controller.

Features
Pointer Lock;
mouse look;
WASD;
ground movement;
acceleration;
friction;
gravity;
ground detection;
jump;
debug telemetry.
Debug Information

Display:

FPS;
frame time;
player velocity;
position;
grounded state.
Exit Criteria

Movement behaves consistently across reasonable frame rates.

No major:

clipping;
camera jitter;
frame-dependent input;
ground detection bugs.
Milestone M1 — FLOW
Goal

Make movement enjoyable.

Features
sprint;
crouch;
slide;
slide momentum;
slide jump;
air acceleration;
air strafing;
jump buffering;
coyote time;
mantle;
vault.
Exit Criteria

The player can spend several minutes moving around the test environment and movement remains enjoyable.

Movement must be:

predictable;
responsive;
configurable;
frame-rate independent.
Milestone M2 — SHOOT
Goal

Create the first polished weapon.

Weapon

Assault Rifle prototype.

Features
fire;
hitscan;
damage;
fire rate;
magazine;
reload;
ADS;
hipfire;
recoil;
spread where applicable;
headshots;
hitmarkers;
damage feedback.
Test Environment
static dummy;
moving dummy;
head hitbox;
body hitbox.
Debug Metrics
shots fired;
shots hit;
accuracy;
damage;
TTK.
Exit Criteria

The AR must feel satisfying before another weapon is added.

Milestone M3 — FIGHT
Goal

Create a complete local combat loop.

Features
player health;
damage;
death;
respawn;
kill feed;
scoreboard;
match timer;
score limit.
Weapons

Add:

SMG;
Shotgun;
Precision Rifle.
Exit Criteria

The game provides a repeatable combat loop:

spawn
fight
kill/death
respawn
fight again
Phase — Map Prototype
Goal

Create the first competitive arena.

Process
graybox;
test;
modify;
test again;
visual production.
Map Requirements
multiple routes;
high ground;
low ground;
flank paths;
movement routes;
close-range areas;
long-range areas;
escape options.
Optional Initial Destruction
glass;
doors;
weak panels;
crates.
Exit Criteria

The map creates varied fights without being confusing.

Phase — Vertical Slice
Goal

Create the first build that represents the target quality.

Requirements
polished movement;
four weapons;
one complete arena;
HUD;
audio;
visual effects;
settings;
death and respawn;
performance optimization.
Exit Criteria

The build can be shown to another player without requiring extensive explanation or apology for prototype quality.

Milestone M4 — ONLINE
Goal

Create multiplayer 1v1.

Server

Future technology:

Node.js;
TypeScript;
Colyseus.
Networking Systems
rooms;
player connection;
player state;
server authority;
client prediction;
reconciliation;
interpolation;
shooting validation;
lag compensation;
disconnect handling.
Exit Criteria

Two remote players can complete stable matches.

Critical requirements:

responsive local movement;
acceptable remote movement;
reliable hit registration;
server-side damage validation.
Private Alpha
Mode

1v1 private rooms.

Features
create room;
join room;
share room code or URL;
complete match;
reconnect behavior where practical.
Telemetry

Track:

ping;
FPS;
server tick performance;
connection errors;
hit registration problems.
Public Alpha
Primary Mode

FFA.

Initial size:

4 players

Then:

6 players
Features
matchmaking;
match timer;
score limit;
spawn system;
scoreboard;
server deployment;
error logging;
basic telemetry.

Guest access should be preferred initially where practical.

Retention Phase

Only after gameplay has demonstrated player interest.

Possible systems:

statistics;
player profiles;
leaderboards;
progression;
challenges;
cosmetics;
additional maps.
Competitive Expansion

Only after multiplayer stability.

Possible features:

2v2;
team modes;
ranked;
skill-based matchmaking;
map rotation.
Future Experimental Phase

Only if justified by player population and technical maturity.

Possible experiments:

larger maps;
larger player counts;
expanded destruction;
abilities;
mini-BR modes.

These are not committed roadmap items.

Development Workflow

Each change should follow:

Issue
↓
Feature branch
↓
Implementation
↓
Tests
↓
Pull Request
↓
CI
↓
Code review
↓
Gameplay validation
↓
Merge
Definition of Done

A development task is Done only when:

acceptance criteria pass;
code is reviewed;
lint passes;
typecheck passes;
required tests pass;
build passes;
no known P0/P1 regression remains.
Priorities
P0 — project/game blocking
P1 — major issue
P2 — normal
P3 — future / optional

P0 and P1 issues take priority over adding non-essential features.

Scope Control

New ideas must not interrupt active milestones automatically.

New ideas go to the backlog.

Every new feature must answer:

Does it improve the core gameplay?
Is it necessary now?
Does it create architectural debt?
Does it delay a more important milestone?
Can it be added later without harming the project?
