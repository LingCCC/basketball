import {tiny, defs} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js'

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export
class Ball {
    constructor() {
        this.mass = 1; // kg
        this.radius = 0.037; // meter
        this.pos = vec3(0, 0, 0);
        this.vel = vec3(0, 0, 0);
        this.acc = vec3(0, 0, 0);
        this.ext_force = vec3(0, 0, 0);
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
        const mu_k = 0.1;
      
        let f_k = vec3(0, 0, 0);
        if (!this.vel.equals(f_k)) {
          f_k = this.vel.normalized().times(fn.norm() * -1 * mu_k);
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
        console.log("acc 1: " + b.ext_force);
        b.acc = b.ext_force.times(1 / b.mass);
        console.log("acc 2: " + b.ext_force);

        console.log("vel 1: " + b.vel);
        b.vel = b.vel.plus(b.acc.times(dt));
        console.log("vel 2: " + b.vel);

        console.log("pos 1: " + b.pos);
        b.pos = b.pos.plus(b.vel.times(dt));
        console.log("pos 2: " + b.pos);
    }

    draw(webgl_manager, uniforms, shapes, materials) {
        const blue = color(0, 0, 1, 1), red = color( 1, 0, 0, 1);
  
        const pos = this.pos;
        let model_transform = Mat4.scale(0.2, 0.2, 0.2);
        model_transform.pre_multiply(Mat4.translation(pos[0], pos[1], pos[2]));
        shapes.ball.draw(webgl_manager, uniforms, model_transform, { ...materials.plastic, color: blue });
    }
}