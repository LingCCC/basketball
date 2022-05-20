import { tiny, defs } from "./examples/common.js";

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } =
  tiny;

export const Particle = class Particle {
  constructor() {
    this.mass = 0;
    this.pos = vec3(0, 0, 0);
    this.vel = vec3(0, 0, 0);
    this.acc = vec3(0, 0, 0);
    this.ext_force = vec3(0, 0, 0);
    this.valid = false;
    this.ground_force = 1;
    this.index = 0; 
  }

  update(dt) {
    if (!this.valid) throw "error";
    this.symplectic_update(dt);
  }

  symplectic_update(dt) {
    this.acc = this.ext_force.times(1 / this.mass);
    this.vel.add_by(this.acc.times(dt));
    this.pos.add_by(this.vel.times(dt));
  }
};

export const Spring = class Spring {
  constructor() {
    this.particle_1 = null;
    this.particle_2 = null;
    this.ks = 0;
    this.kd = 0;
    this.len = 0;
    this.valid = false;
  }

  update(dt, method) {
    if (!this.valid) throw "error";
    let fe_ij = this.calculate_viscoelastic_forces(dt, method);
    this.particle_1.ext_force.add_by(fe_ij);
    this.particle_2.ext_force.subtract_by(fe_ij);
  }

  calculate_viscoelastic_forces(dt) {
    const x_i = this.particle_1.pos.copy();
    const x_j = this.particle_2.pos.copy();
    let v_i = this.particle_1.vel.copy();
    let v_j = this.particle_2.vel.copy();

    const d_ij = x_j.minus(x_i);
    const dir = d_ij.normalized();

    //spring force
    const dist = d_ij.norm();
    let f_s = dir.times(this.ks * (dist - this.len));

    //damper force
    let v_ij = v_j.minus(v_i);
    let f_d = dir.times(this.kd * v_ij.dot(dir));

    return f_s.plus(f_d);
  }
};

export const Simulation = class Simulation {
  constructor() {
    this.particles = [];
    this.springs = [];
    this.g_acc = vec3(0, 0, 0);
    this.ground_ks = 0;
    this.ground_kd = 0;
  }

  create_particles(num) {
    this.particles = [];
    for (let i = 0; i < num; i++) {
      this.particles.push(new Particle());
    }
  }

  create_spring(num) {
    this.springs = [];
    for (let i = 0; i < num; i++) {
      this.springs.push(new Spring());
    }
  }

  set_particle(index, mass, x, y, z, vx, vy, vz) {
    let p = this.particles[index];
    p.mass = mass;
    p.pos = vec3(x, y, z);
    p.vel = vec3(vx, vy, vz);
    p.valid = true;
    p.index = index; 
  }

  set_all_velocities(vx, vy, vz) {
    for (const p of this.particles) {
      p.vel = vec3(vx, vy, vz);
    }
  }

  set_spring(index, pindex1, pindex2, ks, kd, len) {
    let s = this.springs[index];
    s.particle_1 = this.particles[pindex1];
    s.particle_2 = this.particles[pindex2];
    s.ks = ks;
    s.kd = kd;
    s.len = len;
    s.valid = true;
  }

  special_update(dt, static_particles) {
    for (const p of this.particles) {
      p.ext_force = this.g_acc.times(p.mass);
      this.calculate_ground_force(p);
    }
    for (const s of this.springs) {
      s.update();
    }
    for (const p of this.particles) {
      if(!static_particles.includes(p.index)) {
        p.update(dt, this.method);
      }
    }
  }

  update(dt) {
    for (const p of this.particles) {
      p.ext_force = this.g_acc.times(p.mass);
      this.calculate_ground_force(p);
    }
    for (const s of this.springs) {
      s.update(dt, this.method);
    }
    for (const p of this.particles) {
      p.update(dt, this.method);
    }
  }

  calculate_ground_force(particle) {
    const x = particle.pos.copy();
    const ground = vec3(x[0], 0, x[2]);
    const d_ij = x.minus(ground);
    const dir = d_ij.normalized();

    const dist = d_ij.norm();
    let f_s = dir.times(this.ground_ks * (dist - 0));
    let f_d = dir.times(this.ground_kd * particle.vel.dot(dir));

    let f_n = particle.vel.copy();
    let mu = 3.75;
    let friction = f_n.times(mu);

    if (x[1] < 0) {
      particle.ext_force.subtract_by(f_s.plus(f_d).plus(friction));
    }
  }

  draw(webgl_manager, uniforms, shapes, materials) {
    const blue = color(0, 0, 1, 1),
      red = color(1, 0, 0, 1), 
      white = color(1, 1, 1, 1);
    // draw particles
    for (const p of this.particles) {
      const pos = p.pos;
      let model_transform = Mat4.scale(0.05, 0.05, 0.05);
      model_transform.pre_multiply(Mat4.translation(pos[0], pos[1], pos[2]));
    //   shapes.ball.draw(webgl_manager, uniforms, model_transform, {
    //     ...materials.plastic,
    //     color: white,
    //   });
    }
    // draw springs
    for (const s of this.springs) {
      const p1 = s.particle_1.pos.copy();
      const p2 = s.particle_2.pos.copy();
      const len = p2.minus(p1).norm();
      const center = p1.plus(p2).times(0.5);

      let model_transform = Mat4.scale(0.015, len / 2, 0.015);
      const p = p1.minus(p2).normalized();
      let v = vec3(0, 1, 0);
      if (Math.abs(v.cross(p).norm()) < 0.1) {
        v = vec3(0, 0, 1);
        model_transform = Mat4.scale(0.015, 0.015, len / 2);
      }
      const w = v.cross(p).normalized();

      const theta = Math.acos(v.dot(p));
      model_transform.pre_multiply(Mat4.rotation(theta, w[0], w[1], w[2]));
      model_transform.pre_multiply(
        Mat4.translation(center[0], center[1], center[2])
      );
      shapes.box.draw(webgl_manager, uniforms, model_transform, {
        ...materials.pure_color,
        color: white,
      });
    }
  }
};