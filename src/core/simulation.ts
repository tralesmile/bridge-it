import { Box, Circle, DistanceJoint, RevoluteJoint, RopeJoint, Vec2, WheelJoint, World, type Body, type Joint } from 'planck';
import { distance, pointOf } from './bridge';
import { MATERIALS } from './materials';
import type { Beam, LevelDef, LossReason, Point, SimStatus } from './types';
import { VEHICLES, type VehicleDef } from './vehicles';

/** Physics runs at a fixed step so results are identical on every device. */
export const STEP = 1 / 120;
export const MAX_TIME = 25;
const VELOCITY_ITERATIONS = 12;
const POSITION_ITERATIONS = 8;
const GRAVITY = -10;
/** cos of the tilt angle past which the vehicle counts as upside down (about 100 degrees). */
const FLIP_COS = -0.17;
/** Share of motor torque used as a brake when a wheel spins faster than its target speed. */
const COAST_TORQUE = 0.1;

// Collision categories.
const CAT_TERRAIN = 0x0001;
const CAT_ROAD = 0x0002;
const CAT_VEHICLE = 0x0004;

const NODE_RADIUS = 0.08;
const NODE_DENSITY = 300;
const LOAD_FILTER = 0.92;
const ROAD_THICKNESS = 0.2;
/** Pistons start to grow at PISTON_START seconds and take PISTON_TIME seconds to reach full length. */
export const PISTON_START = 0.5;
export const PISTON_TIME = 1.5;

export interface BeamState {
  beam: Beam;
  /** 0 = relaxed, 1 = about to break. */
  stress: number;
  broken: boolean;
  /** Current end positions (they move as the bridge bends). */
  a: Point;
  b: Point;
}

export interface VehicleState {
  x: number;
  y: number;
  angle: number;
  wheels: { x: number; y: number; angle: number; radius: number }[];
  def: VehicleDef;
}

export interface SimEvent {
  type: 'break';
  at: Point;
  material: Beam['material'];
}

interface SimBeam {
  state: BeamState;
  joints: Joint[];
  /** Road beams have their own body; structural beams are just a joint. */
  body: Body | null;
  strength: number;
  /** Filtered joint force in newtons. */
  load: number;
}

/**
 * Runs one attempt: builds the physics world from a design and steps it.
 * It holds no rendering code so it runs the same in tests and in the game.
 */
export class Simulation {
  readonly world: World;
  status: SimStatus = 'running';
  lossReason: LossReason | null = null;
  time = 0;
  readonly events: SimEvent[] = [];

  private readonly nodes = new Map<string, Body>();
  private readonly beams: SimBeam[] = [];
  private readonly chassis: Body;
  private readonly wheels: Body[] = [];
  private readonly wheelJoints: WheelJoint[] = [];
  private readonly vehicleDef: VehicleDef;
  private readonly goalX: number;
  private readonly pistons: { joint: DistanceJoint; length: number; grow: number }[] = [];
  private stuckTimer = 0;
  private flipTimer = 0;
  private lastX = 0;

  constructor(private readonly level: LevelDef, design: Beam[]) {
    this.world = new World({ gravity: Vec2(0, GRAVITY) });
    this.vehicleDef = VEHICLES[level.vehicle];
    this.goalX = level.gapEnd + (level.goalDistance ?? 4);
    this.buildTerrain();
    for (const anchor of level.anchors) this.nodeBody(`${anchor.x},${anchor.y}`, true);
    for (const beam of design) this.addBeam(beam);
    this.chassis = this.buildVehicle();
    this.lastX = this.chassis.getPosition().x;
  }

  /** Advances the world by one fixed step. */
  step(): void {
    if (this.status !== 'running') return;
    this.growPistons();
    this.coastDownhill();
    this.world.step(STEP, VELOCITY_ITERATIONS, POSITION_ITERATIONS);
    this.time += STEP;
    if (!this.isFinite()) {
      // Watchdog: a broken solver must end the attempt, never freeze the game.
      this.lose('collapse');
      return;
    }
    this.checkBreaks();
    this.checkOutcome();
  }

  /** Runs until the attempt ends. Used by tests and the level validator. */
  runToEnd(maxTime = MAX_TIME): SimStatus {
    while (this.status === 'running' && this.time < maxTime) this.step();
    if (this.status === 'running') this.lose('timeout');
    return this.status;
  }

  get beamStates(): BeamState[] {
    return this.beams.map((b) => b.state);
  }

  get vehicle(): VehicleState {
    const p = this.chassis.getPosition();
    return {
      x: p.x,
      y: p.y,
      angle: this.chassis.getAngle(),
      def: this.vehicleDef,
      wheels: this.wheels.map((w) => ({
        x: w.getPosition().x,
        y: w.getPosition().y,
        angle: w.getAngle(),
        radius: this.vehicleDef.wheelRadius,
      })),
    };
  }

  get brokenCount(): number {
    return this.beams.filter((b) => b.state.broken).length;
  }

  private buildTerrain(): void {
    const ground = this.world.createBody({ type: 'static' });
    const { gapStart, gapEnd, leftHeight, rightHeight } = this.level;
    const depth = 20;
    const width = 30;
    const opts = { friction: 0.9, filterCategoryBits: CAT_TERRAIN, filterMaskBits: CAT_VEHICLE };
    ground.createFixture(new Box(width / 2, (depth + leftHeight) / 2, Vec2(gapStart - width / 2, (leftHeight - depth) / 2)), opts);
    ground.createFixture(new Box(width / 2, (depth + rightHeight) / 2, Vec2(gapEnd + width / 2, (rightHeight - depth) / 2)), opts);
  }

  private nodeBody(key: string, isStatic: boolean): Body {
    const existing = this.nodes.get(key);
    if (existing) return existing;
    const p = pointOf(key);
    const body = this.world.createBody({ type: isStatic ? 'static' : 'dynamic', position: Vec2(p.x, p.y) });
    // Nodes have mass but never collide with anything.
    body.createFixture(new Circle(NODE_RADIUS), { density: NODE_DENSITY, filterCategoryBits: 0, filterMaskBits: 0 });
    this.nodes.set(key, body);
    return body;
  }

  private addBeam(beam: Beam): void {
    const material = MATERIALS[beam.material];
    const pa = pointOf(beam.a);
    const pb = pointOf(beam.b);
    const length = distance(pa, pb);
    if (length === 0) return;
    const anchors = new Set(this.level.anchors.map((a) => `${a.x},${a.y}`));
    const na = this.nodeBody(beam.a, anchors.has(beam.a));
    const nb = this.nodeBody(beam.b, anchors.has(beam.b));
    const state: BeamState = { beam, stress: 0, broken: false, a: pa, b: pb };
    const mass = material.massPerMetre * length;

    if (material.isRoad) {
      const angle = Math.atan2(pb.y - pa.y, pb.x - pa.x);
      const body = this.world.createBody({
        type: 'dynamic',
        position: Vec2((pa.x + pb.x) / 2, (pa.y + pb.y) / 2),
        angle,
      });
      const area = length * ROAD_THICKNESS;
      body.createFixture(new Box(length / 2, ROAD_THICKNESS / 2), {
        density: mass / area,
        friction: 0.9,
        filterCategoryBits: CAT_ROAD,
        filterMaskBits: CAT_VEHICLE,
      });
      const ja = this.world.createJoint(new RevoluteJoint({}, body, na, Vec2(pa.x, pa.y)));
      const jb = this.world.createJoint(new RevoluteJoint({}, body, nb, Vec2(pb.x, pb.y)));
      this.beams.push({ state, joints: [ja, jb].filter((j): j is RevoluteJoint => j !== null), body, strength: material.strength, load: 0 });
    } else {
      // Structural beams add half their mass to each end node.
      for (const node of [na, nb]) {
        if (node.isDynamic()) node.createFixture(new Circle(NODE_RADIUS), { density: mass / 2 / (Math.PI * NODE_RADIUS ** 2), filterCategoryBits: 0, filterMaskBits: 0 });
      }
      // A beam between two anchors carries nothing, and planck crashes reading a joint between two static bodies.
      if (!na.isDynamic() && !nb.isDynamic()) {
        this.beams.push({ state, joints: [], body: null, strength: material.strength, load: 0 });
        return;
      }
      // Ropes only pull (RopeJoint); other beams also push (DistanceJoint).
      const joint = this.world.createJoint(
        material.tensionOnly
          ? new RopeJoint({ bodyA: na, bodyB: nb, localAnchorA: Vec2(0, 0), localAnchorB: Vec2(0, 0), maxLength: length })
          : new DistanceJoint({ frequencyHz: 0, dampingRatio: 0, length }, na, nb, Vec2(pa.x, pa.y), Vec2(pb.x, pb.y)),
      );
      if (joint instanceof DistanceJoint && material.extends) this.pistons.push({ joint, length, grow: length * material.extends });
      this.beams.push({ state, joints: joint ? [joint] : [], body: null, strength: material.strength, load: 0 });
    }
  }

  private growPistons(): void {
    const t = Math.min(1, Math.max(0, (this.time - PISTON_START) / PISTON_TIME));
    for (const p of this.pistons) if (p.joint.getBodyA()) p.joint.setLength(p.length + p.grow * t);
  }

  private buildVehicle(): Body {
    const def = this.vehicleDef;
    const startX = this.level.gapStart - 4;
    const groundY = this.level.leftHeight;
    const chassisY = groundY + def.wheelRadius * 2 + def.halfHeight;
    const chassis = this.world.createBody({ type: 'dynamic', bullet: true, position: Vec2(startX, chassisY) });
    const chassisArea = def.halfWidth * 2 * def.halfHeight * 2;
    const vehicleFilter = { filterCategoryBits: CAT_VEHICLE, filterMaskBits: CAT_TERRAIN | CAT_ROAD };
    chassis.createFixture(new Box(def.halfWidth, def.halfHeight), { density: def.chassisMass / chassisArea, friction: 0.5, ...vehicleFilter });
    for (const offset of def.wheelOffsets) {
      const wheel = this.world.createBody({ type: 'dynamic', bullet: true, position: Vec2(startX + offset, groundY + def.wheelRadius) });
      wheel.createFixture(new Circle(def.wheelRadius), {
        density: def.wheelMass / (Math.PI * def.wheelRadius ** 2),
        friction: 1.2,
        ...vehicleFilter,
      });
      const joint = new WheelJoint(
        { enableMotor: true, motorSpeed: def.motorSpeed, maxMotorTorque: def.motorTorque, frequencyHz: 5, dampingRatio: 0.8 },
        chassis,
        wheel,
        wheel.getPosition(),
        Vec2(0, 1),
      );
      this.world.createJoint(joint);
      this.wheels.push(wheel);
      this.wheelJoints.push(joint);
    }
    return chassis;
  }

  /**
   * Motors drive but barely brake: a wheel spinning faster than its target (downhill) only gets a weak motor.
   * Full braking torque pitched cars nose-down and flipped them on 1 m slopes.
   */
  private coastDownhill(): void {
    const def = this.vehicleDef;
    for (const joint of this.wheelJoints) {
      const tooFast = def.motorSpeed < 0 ? joint.getJointSpeed() < def.motorSpeed : joint.getJointSpeed() > def.motorSpeed;
      joint.setMaxMotorTorque(tooFast ? def.motorTorque * COAST_TORQUE : def.motorTorque);
    }
  }

  private checkBreaks(): void {
    const invDt = 1 / STEP;
    for (const sb of this.beams) {
      if (sb.state.broken) {
        // Broken road beams still swing, so keep their drawn position current.
        if (sb.body) this.updateBeamEnds(sb);
        continue;
      }
      let worst = 0;
      for (const joint of sb.joints) {
        const force = joint.getReactionForce(invDt).length();
        if (force > worst) worst = force;
      }
      // Filter the load over about 0.1 s so a single impact spike does not snap a beam,
      // but a sustained overload does. This also keeps stress colours from flickering.
      sb.load = sb.load * LOAD_FILTER + worst * (1 - LOAD_FILTER);
      sb.state.stress = Math.min(1, sb.load / sb.strength);
      if (sb.load > sb.strength) {
        this.breakBeam(sb);
        continue;
      }
      this.updateBeamEnds(sb);
    }
  }

  private breakBeam(sb: SimBeam): void {
    sb.state.broken = true;
    sb.state.stress = 1;
    this.updateBeamEnds(sb);
    // Road beams lose one joint (they swing down); structural beams vanish.
    const joint = sb.body ? sb.joints.shift() : sb.joints.pop();
    if (joint) this.world.destroyJoint(joint);
    if (!sb.body) sb.joints.length = 0;
    const mid = { x: (sb.state.a.x + sb.state.b.x) / 2, y: (sb.state.a.y + sb.state.b.y) / 2 };
    this.events.push({ type: 'break', at: mid, material: sb.state.beam.material });
  }

  private updateBeamEnds(sb: SimBeam): void {
    if (sb.body) {
      const half = distance(pointOf(sb.state.beam.a), pointOf(sb.state.beam.b)) / 2;
      const c = sb.body.getPosition();
      const angle = sb.body.getAngle();
      const dx = Math.cos(angle) * half;
      const dy = Math.sin(angle) * half;
      sb.state.a = { x: c.x - dx, y: c.y - dy };
      sb.state.b = { x: c.x + dx, y: c.y + dy };
    } else {
      const a = this.nodes.get(sb.state.beam.a)?.getPosition();
      const b = this.nodes.get(sb.state.beam.b)?.getPosition();
      if (a && b) {
        sb.state.a = { x: a.x, y: a.y };
        sb.state.b = { x: b.x, y: b.y };
      }
    }
  }

  private checkOutcome(): void {
    const p = this.chassis.getPosition();
    if (p.x >= this.goalX && Math.cos(this.chassis.getAngle()) >= FLIP_COS) {
      this.status = 'won';
      return;
    }
    if (p.y < Math.min(this.level.leftHeight, this.level.rightHeight) - 6) {
      this.lose('fell');
      return;
    }
    // Flipped: upside down (more than ~100 degrees) for half a second. A vehicle on its roof never wins.
    if (Math.cos(this.chassis.getAngle()) < FLIP_COS) this.flipTimer += STEP;
    else this.flipTimer = 0;
    if (this.flipTimer > 0.5) {
      this.lose('flipped');
      return;
    }
    // Stuck: barely moved for 3 seconds.
    if (Math.abs(p.x - this.lastX) < 0.01) this.stuckTimer += STEP;
    else this.stuckTimer = 0;
    this.lastX = p.x;
    if (this.stuckTimer > 3) this.lose('stuck');
  }

  /** False when the vehicle or any bridge body has a NaN or infinite position. */
  private isFinite(): boolean {
    const ok = (b: Body): boolean => {
      const p = b.getPosition();
      return Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(b.getAngle());
    };
    if (!ok(this.chassis) || !this.wheels.every(ok)) return false;
    for (const n of this.nodes.values()) if (!ok(n)) return false;
    return this.beams.every((b) => !b.body || ok(b.body));
  }

  private lose(reason: LossReason): void {
    this.status = 'lost';
    this.lossReason = reason;
  }
}
