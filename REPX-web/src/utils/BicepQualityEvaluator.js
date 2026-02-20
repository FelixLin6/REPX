const DEFAULT_SAMPLE_RATE_HZ = 50;
const TWO_PI_DEG = 360;
const HALF_TURN_DEG = 180;
const ALPHA_ANGLE = 0.2;
const ALPHA_VEL = 0.2;
const ALPHA_JERK = 0.2;
const DT_MIN = 0.001;
const DT_MAX = 0.1;
const ISSUE_COOLDOWN_S = 3;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const smooth = (value, prev, alpha) =>
  prev === null || prev === undefined ? value : prev + alpha * (value - prev);

const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx];
};

const unwrapDeg = (value, prev) => {
  if (!Number.isFinite(value)) return prev ?? null;
  if (prev === null || prev === undefined) return value;
  let diff = value - prev;
  while (diff > HALF_TURN_DEG) diff -= TWO_PI_DEG;
  while (diff < -HALF_TURN_DEG) diff += TWO_PI_DEG;
  return prev + diff;
};

export default class BicepQualityEvaluator {
  constructor(sample_rate_hz = DEFAULT_SAMPLE_RATE_HZ) {
    this.sampleRateHz = sample_rate_hz;
    this.dt = 1 / this.sampleRateHz;
    this.reset();
  }

  reset() {
    this.elbowOffset = 0;
    this.upperarmOffset = 0;
    this.lastSeq = null;

    this.elbowUnwrapped = null;
    this.upperUnwrapped = null;
    this.elbowSmoothed = null;
    this.upperSmoothed = null;
    this.elbowVelSmoothed = null;
    this.upperVelSmoothed = null;
    this.jerkSmoothed = null;

    this.manualCalibrating = false;
    this.calibSamples = [];
    this.autoCalibActive = true;
    this.autoCalibrated = false;
    this.autoBuffer = [];

    this.repActive = false;
    this.repBuffers = null;

    this.lastIssueTime = {};
  }

  calibrate_start() {
    this.manualCalibrating = true;
    this.calibSamples = [];
  }

  calibrate_finish() {
    if (this.calibSamples.length === 0) {
      this.manualCalibrating = false;
      return;
    }
    const elbowMean =
      this.calibSamples.reduce((s, v) => s + v.dP, 0) / this.calibSamples.length;
    const upperMean =
      this.calibSamples.reduce((s, v) => s + v.p0, 0) / this.calibSamples.length;
    this.elbowOffset = elbowMean;
    this.upperarmOffset = upperMean;
    this.manualCalibrating = false;
    this.autoCalibActive = false;
    this.autoCalibrated = true;
  }

  start_rep() {
    this.repActive = true;
    this.repBuffers = {
      elbowAngles: [],
      elbowVels: [],
      upperAngles: [],
      upperVels: [],
      jerks: [],
    };
  }

  end_rep(rep_time_s, current_set_time_s) {
    if (!this.repActive || !this.repBuffers) {
      return {
        rep_metrics: {
          ROM: 0,
          peak_elbow_vel: 0,
          upperarm_sway: 0,
          swing_ratio: 0,
          jerk_p95: 0,
        },
        issue: null,
        coach_cue: null,
      };
    }

    const { elbowAngles, elbowVels, upperAngles, jerks } = this.repBuffers;

    const ROM =
      elbowAngles.length > 0
        ? Math.max(...elbowAngles) - Math.min(...elbowAngles)
        : 0;
    const peak_elbow_vel =
      elbowVels.length > 0 ? Math.max(...elbowVels.map((v) => Math.abs(v))) : 0;
    const upperarm_sway =
      upperAngles.length > 0
        ? Math.max(...upperAngles) - Math.min(...upperAngles)
        : 0;
    const swing_ratio = upperarm_sway / Math.max(ROM, 1e-6);
    const jerk_p95 =
      jerks.length > 0 ? percentile(jerks.map((j) => Math.abs(j)), 95) : 0;

    // Bad-form checks are intentionally disabled for now.
    const issue = null;
    const coach_cue = null;

    const rep_metrics = {
      ROM,
      peak_elbow_vel,
      upperarm_sway,
      swing_ratio,
      jerk_p95,
    };

    this.repActive = false;
    this.repBuffers = null;

    return { rep_metrics, issue, coach_cue };
  }

  update(packet) {
    const seq = packet?.seq ?? null;
    const dP = packet?.dP;
    const p0 = packet?.p0;

    // Calibration collection
    if (this.manualCalibrating && Number.isFinite(dP) && Number.isFinite(p0)) {
      this.calibSamples.push({ dP, p0 });
    } else if (
      this.autoCalibActive &&
      !this.autoCalibrated &&
      Number.isFinite(dP) &&
      Number.isFinite(p0)
    ) {
      this.autoBuffer.push({ dP, p0 });
      if (this.autoBuffer.length >= this.sampleRateHz) {
        const elbowMean =
          this.autoBuffer.reduce((s, v) => s + v.dP, 0) / this.autoBuffer.length;
        const upperMean =
          this.autoBuffer.reduce((s, v) => s + v.p0, 0) / this.autoBuffer.length;
        this.elbowOffset = elbowMean;
        this.upperarmOffset = upperMean;
        this.autoCalibActive = false;
        this.autoCalibrated = true;
      }
    }

    // Timing
    const seqDiff =
      this.lastSeq === null || seq === null
        ? 1
        : (seq - this.lastSeq + 65536) % 65536 || 1;
    const dtEffective = clamp(seqDiff * this.dt, DT_MIN, DT_MAX);
    if (seq !== null) this.lastSeq = seq;

    // Angles and velocities
    const elbowRaw = Number.isFinite(dP) ? dP - this.elbowOffset : null;
    const upperRaw = Number.isFinite(p0) ? p0 - this.upperarmOffset : null;

    const elbowUnwrapped = unwrapDeg(elbowRaw, this.elbowUnwrapped);
    const upperUnwrapped = unwrapDeg(upperRaw, this.upperUnwrapped);

    const prevElbowSmoothed = this.elbowSmoothed;
    const prevUpperSmoothed = this.upperSmoothed;
    const prevElbowVel = this.elbowVelSmoothed;

    if (elbowUnwrapped !== null) {
      this.elbowUnwrapped = elbowUnwrapped;
      this.elbowSmoothed = smooth(elbowUnwrapped, this.elbowSmoothed, ALPHA_ANGLE);
    }
    if (upperUnwrapped !== null) {
      this.upperUnwrapped = upperUnwrapped;
      this.upperSmoothed = smooth(upperUnwrapped, this.upperSmoothed, ALPHA_ANGLE);
    }

    if (this.elbowSmoothed !== null && prevElbowSmoothed !== null) {
      const velRaw = (this.elbowSmoothed - prevElbowSmoothed) / dtEffective;
      this.elbowVelSmoothed = smooth(velRaw, this.elbowVelSmoothed, ALPHA_VEL);
    }

    if (this.upperSmoothed !== null && prevUpperSmoothed !== null) {
      const velRaw = (this.upperSmoothed - prevUpperSmoothed) / dtEffective;
      this.upperVelSmoothed = smooth(velRaw, this.upperVelSmoothed, ALPHA_VEL);
    }

    if (
      this.elbowVelSmoothed !== null &&
      prevElbowVel !== null
    ) {
      const jerkRaw = (this.elbowVelSmoothed - prevElbowVel) / dtEffective;
      this.jerkSmoothed = smooth(jerkRaw, this.jerkSmoothed, ALPHA_JERK);
    }

    // Rep buffering
    if (this.repActive && this.repBuffers) {
      if (this.elbowSmoothed !== null)
        this.repBuffers.elbowAngles.push(this.elbowSmoothed);
      if (this.elbowVelSmoothed !== null)
        this.repBuffers.elbowVels.push(this.elbowVelSmoothed);
      if (this.upperSmoothed !== null)
        this.repBuffers.upperAngles.push(this.upperSmoothed);
      if (this.upperVelSmoothed !== null)
        this.repBuffers.upperVels.push(this.upperVelSmoothed);
      if (this.jerkSmoothed !== null) this.repBuffers.jerks.push(this.jerkSmoothed);
    }

    return {
      elbow_angle_deg: this.elbowSmoothed,
      elbow_vel_deg_s: this.elbowVelSmoothed,
      upperarm_angle_deg: this.upperSmoothed,
      upperarm_vel_deg_s: this.upperVelSmoothed,
    };
  }
}

// Example usage snippets (not executed by default):
// const ev = new BicepQualityEvaluator();
// ev.start_rep();
// // Feed synthetic packets for a slow, clean curl
// for (let i = 0; i < 50; i++) {
//   ev.update({ seq: i, dP: i * 2, p0: 0, r0: 0, y0: 0, r1: 0, p1: 0, y1: 0, dR: 0, dY: 0 });
// }
// const result = ev.end_rep(1.2, 5.0);
// console.log(result);
