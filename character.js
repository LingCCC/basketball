import {tiny, defs} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js'

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export
class Character {
    constructor() {
        this.pos = vec3(0, 0, 10);
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

    update(dt) {
        this.symplectic_euler(this, dt);
    }

    symplectic_euler(b, dt) {
        b.acc = b.ext_force.times(1 / b.mass);
        b.vel = b.vel.plus(b.acc.times(dt));
        b.pos = b.pos.plus(b.vel.times(dt));
    }

    draw(webgl_manager, uniforms, shapes, materials) {
        const blue = color(0, 0, 1, 1), red = color( 1, 0, 0, 1);
  
        const pos = this.pos;
        let model_transform = Mat4.scale(0.2, 1, 0.2);
        model_transform.pre_multiply(Mat4.translation(pos[0], pos[1] + 1, pos[2]));
        shapes.box.draw(webgl_manager, uniforms, model_transform, { ...materials.plastic, color: red });
    }
}