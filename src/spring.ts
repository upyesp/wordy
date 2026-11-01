/**
 * Underdamped spring shared by every dip and the release bounce (Round 1, Q7):
 * fast attack, soft settle, slight overshoot.
 */
const STIFFNESS = 170;
const DAMPING_RATIO = 0.55;
const DAMPING = 2 * DAMPING_RATIO * Math.sqrt(STIFFNESS);

export class Spring {
  value = 0;
  velocity = 0;
  target = 0;

  step(dt: number): void {
    const accel = -STIFFNESS * (this.value - this.target) - DAMPING * this.velocity;
    this.velocity += accel * dt;
    this.value += this.velocity * dt;
  }

  atRest(eps = 0.0015): boolean {
    return Math.abs(this.value - this.target) < eps && Math.abs(this.velocity) < eps;
  }
}
