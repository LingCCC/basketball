import { tiny, defs } from "./examples/common.js";
import { Shape_From_File } from "./examples/obj-file-demo.js";
import { Hermite_Spline } from "./spline.js";

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } =
  tiny;

export class Ball {
  constructor() {
    this.mass = 1; // kg
    this.radius = 0.037; // meter
    this.pos = vec3(0, 3.5, 0);
    this.vel = vec3(0, 0, 0);
    this.acc = vec3(0, 0, 0);
    this.ext_force = vec3(0, 0, 0);
    this.arc = null; 
  }

  calculate_force(surface_p, normal) {
    //const ground_p = vec3(0, 0, 0);
    const ks = 5000;
    const kd = 10;
    //const normal = vec3(0, 1, 0);

    const d_pg = surface_p.minus(this.pos);
    const lhs = normal.times(d_pg.dot(normal)).times(ks);
    const rhs = normal.times(this.vel.dot(normal)).times(kd);
    const fn = lhs.minus(rhs);

    if (fn.dot(normal) > 0) {
      this.ext_force.add_by(fn);
    }
  }

  calculate_friction(g_acc) {
    const fn = g_acc.times(this.mass);
    const mu_k = .1;

    let f_k = vec3(0, 0, 0);
    if (!this.vel.equals(f_k)) {
      f_k = this.vel.times(fn.norm() * -1 * mu_k);
    }

    if (this.pos[1] > -0.1 && this.pos[1] < 0.1) {
      f_k[1] = 0;
      this.ext_force.add_by(f_k);
    }
  }

  update(dt) {
    this.symplectic_euler(this, dt);
  }

  symplectic_euler(b, dt) {
    //console.log("acc 1: " + b.ext_force);
    b.acc = b.ext_force.times(1 / b.mass);
    //console.log("acc 2: " + b.ext_force);

    //console.log("vel 1: " + b.vel);
    b.vel = b.vel.plus(b.acc.times(dt));
    //console.log("vel 2: " + b.vel);

    //console.log("pos 1: " + b.pos);
    b.pos = b.pos.plus(b.vel.times(dt));
    //console.log("pos 2: " + b.pos);
  }

  did_collide(surface_p, normal, pos) {
    const ks = 5000;
    const kd = 10;

    const d_pg = surface_p.minus(pos);
    const lhs = normal.times(d_pg.dot(normal)).times(ks);
    const rhs = normal.times(this.vel.dot(normal)).times(kd);
    const fn = lhs.minus(rhs);

    return fn.dot(normal) > 0
  }

  //collision with walls detection
  collision(pos) {
    const ground = vec3(0, 0, 0);
    const ground_normal = vec3(0, 1, 0);
    const front_wall = vec3(0, 0, -10);
    const front_wall_normal = vec3(0, 0, 1);
    const left_wall = vec3(-10, 0, 0);
    const left_wall_normal = vec3(1, 0, 0);
    const right_wall = vec3(10, 0, 0);
    const right_wall_normal = vec3(-1, 0, 0);
    const back_wall = vec3(0, 0, 10);
    const back_wall_normal = vec3(0, 0, -1);

    return this.did_collide(ground, ground_normal,pos) ||  // ground
            this.did_collide(front_wall, front_wall_normal, pos) || // front wall
            this.did_collide(left_wall, left_wall_normal, pos) ||// left wall
            this.did_collide(right_wall, right_wall_normal, pos) || // right wall
            this.did_collide(back_wall, back_wall_normal, pos);// back wall
  }

  update_arc(dt, force, length) {
    let vel = this.vel.copy();
    let pos = this.pos.copy();
    let acc = this.pos.copy();
    let ext_force = vec3(0, -9.8, 0).times(this.mass).plus(force);
    let h = new Hermite_Spline();
    let k = 0; 

    while(k < length) { // upper bound to prevent infinite loops
        if (k % 100 === 0) {
            h.add_point(pos[0], pos[1], pos[2], vel[0], vel[1], vel[2]);
        }
        if(this.collision(pos)) { //stop drawing at the first time the collides with a wall
            h.add_point(pos[0], pos[1], pos[2], vel[0], vel[1], vel[2]);
            break; 
        }
        acc = ext_force.times(1 / this.mass);
        vel = vel.plus(acc.times(dt));
        pos = pos.plus(vel.times(dt));
        ext_force = vec3(0, -9.8, 0);
        k++;
    }  
    this.arc = h; 
  }

  draw(webgl_manager, uniforms, shapes, materials, running, dt, force) {
    const blue = color(0, 0, 1, 1), red = color(1, 0, 0, 1);

    //draw shooting arc
    if (running === false) {
      //this.make_arc(dt, force);
      shapes.curve.update(webgl_manager, uniforms, (s) =>
        this.arc.get_position(s)
      );
      shapes.curve.draw(webgl_manager, uniforms);
    }

    const pos = this.pos;
    let model_transform = Mat4.scale(0.5, 0.5, 0.5);
    model_transform.pre_multiply(Mat4.translation(pos[0], pos[1], pos[2]));
    shapes.ball.draw(webgl_manager, uniforms, model_transform, {
      ...materials.ball,
    });
  }
}
