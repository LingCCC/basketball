import {tiny, defs} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js'
import { Ball } from './ball.js';
import { Character } from './character.js';
import { Simulation } from './mass-spring-damper.js';
import { Curve_Shape } from './spline.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

// TODO: you should implement the required classes here or in another file.
//Checks if current position is close to the intended destination
function closeToDest(destination, position, std=0.1)
{
  let effPos = position;
  let xDiff = Math.abs(effPos[0] - destination[0]);
  let yDiff = Math.abs(effPos[1] - destination[1]);
  let zDiff = Math.abs(effPos[2] - destination[2]);
  if(xDiff < std && yDiff < std && zDiff < std)
  {
    return true;
  }
  return false;
}

export
const Basketball_Sim_base = defs.Assignment2_base =
    class Basketball_Sim_base extends Component
    {                                          
      // **My_Demo_Base** is a Scene that can be added to any display canvas.
      // This particular scene is broken up into two pieces for easier understanding.
      // The piece here is the base class, which sets up the machinery to draw a simple
      // scene demonstrating a few concepts.  A subclass of it, Assignment2,
      // exposes only the display() method, which actually places and draws the shapes,
      // isolating that code so it can be experimented with on its own.
      init()
      {
        console.log("init")

        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        this.hover = this.swarm = false;
        // At the beginning of our program, load one of each of these shape
        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape it
        // would be redundant to tell it again.  You should just re-use the
        // one called "box" more than once in display() to draw multiple cubes.
        // Don't define more than one blueprint for the same thing here.
        this.shapes = { 'box'  : new defs.Cube(),
          'ball' : new defs.Subdivision_Sphere( 4 ),
          'axis' : new defs.Axis_Arrows(), 
          'ring' : new defs.Cylindrical_Tube(20, 20, [1,2]),
          'wall' : new Shape_From_File('assets/Fence.obj'),
          'bench': new Shape_From_File('assets/Bench_HighRes.obj'),
          'curve': new Curve_Shape((t) => {vec3(0, 0, 0)}, 100, color(0, 0, 1, 1)),
        };

        // *** Materials: ***  A "material" used on individual shapes specifies all fields
        // that a Shader queries to light/color it properly.  Here we use a Phong shader.
        // We can now tweak the scalar coefficients from the Phong lighting formulas.
        // Expected values can be found listed in Phong_Shader::update_GPU().
        const basic = new defs.Basic_Shader();
        const phong = new defs.Phong_Shader();
        const tex_phong = new defs.Textured_Phong();
        this.materials = {};
        this.materials.plastic = { shader: phong, ambient: .2, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) }
        this.materials.metal   = { shader: phong, ambient: .2, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) }
        this.materials.rgb = { shader: tex_phong, ambient: .5, texture: new Texture( "assets/rgb.jpg" ) }
        this.materials.wall2 = { shader: phong, ambient: .2, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) }
        this.materials.wall = {shader: tex_phong, ambient: .2, texture: new Texture( "assets/Fence.jpg" )}
        this.materials.court = {shader: tex_phong, ambient: .9, texture: new Texture( "assets/court.png" )}
        this.materials.backboard = {shader: tex_phong, ambient: .9, texture: new Texture( "assets/backboard.jpg" )}
        this.materials.ball = {shader: tex_phong, ambient: .9, texture: new Texture( "assets/basketball.png" )}
        this.materials.pure_color = {shader: phong, ambient: 1, diffusivity: 0, specularity: 0, color: color(.9, .5, .9, 1)}
        this.materials.gravel = {shader: tex_phong, ambient: .9, texture: new Texture( "assets/road.png" )}


        // TODO: you should create a Spline class instance
        //Variable Declaration For Basketball Travel
        this.UDangle = 60;
        this.LRangle = 90;
        this.velocity = 60;
        this.xVelocity = 0;
        this.zVelocity = 0;
        this.yVelocity = 0;

        // this.ball_location = vec3(0, 0, 0);
        // this.ball_radius = 0.25;

        this.ball = new Ball();
        this.time_step = 0.001;
        this.running = true;
        this.shoot = false; 
        this.t_sim = 0.0;
        this.sim_speed = 1.0;
        this.g_acc = vec3(0, -9.8, 0);
        this.force = vec3(0, 0, 0);
        this.ball.update_arc(this.time_step, this.force, this.spline_length); 

        this.init_hoop(); 

        this.spline_length = 5000; 


        //Scoring
        this.score = 0;
        this.reachHoop = false;
        this.reachNet = false;

      }

      init_hoop() {
        this.sim = new Simulation(); 
        this.sim.ground_ks = 0; 
        this.sim.ground_kd = 0; 
        this.sim.g_acc = vec3(0, -9.8, 0);

        let num_layers = 5; 
        this.sim.create_particles(num_layers * 6); 
        for(let i = 0; i < num_layers; i++)  {
          const y = 6.5-(.3*i); 
          const mass = .3; 
          if(i%2 === 0) { //even row
            this.sim.set_particle((i*6) + 0, mass,    0, y, -8.1, 0, 0, 0); 
            this.sim.set_particle((i*6) + 1, mass,  .59, y, -8.5, 0, 0, 0); 
            this.sim.set_particle((i*6) + 2, mass,  .63, y, -9.1, 0, 0, 0); 
            this.sim.set_particle((i*6) + 3, mass,    0, y, -9.5, 0, 0, 0); 
            this.sim.set_particle((i*6) + 4, mass, -.63, y, -9.1, 0, 0, 0); 
            this.sim.set_particle((i*6) + 5, mass, -.59, y, -8.5,0, 0, 0);
          } else { //odd row
            this.sim.set_particle((i*6) + 0, mass,   .4, y, -8.25, 0, 0, 0); 
            this.sim.set_particle((i*6) + 1, mass,  .68, y,  -8.8, 0, 0, 0); 
            this.sim.set_particle((i*6) + 2, mass,   .4, y,  -9.4, 0, 0, 0); 
            this.sim.set_particle((i*6) + 3, mass,  -.4, y,  -9.4, 0, 0, 0); 
            this.sim.set_particle((i*6) + 4, mass, -.68, y,  -8.8, 0, 0, 0); 
            this.sim.set_particle((i*6) + 5, mass,  -.4, y, -8.25, 0, 0, 0); 
          }
        }

        this.top_rim = [0, 1, 2, 3, 4, 5]; 

        this.sim.create_spring((num_layers-1)*12); 
        const ks = 11, kd = 25, len = 0; // still need to adjust these parameters a bit
        for(let i = 0; i < num_layers-1; i++) {
          if(i%2 === 0) { 
            for(let k = 0; k < 6; k++) {
              const p1 = ((i*6) + k+1) >= (6*(i+1)) ? 6*i   : ((i*6) + k+1);
              this.sim.set_spring(    (i*12)+(2*k), ((i*6) + k), ((i+1)*6) + k, ks, kd, len); 
              this.sim.set_spring((i*12)+((2*k)+1),          p1, ((i+1)*6) + k, ks, kd, len); 
            }
          }
          else {
            for(let k = 0; k < 6; k++) {
              const p2 = ((6*(i+1)) + k+1) >= (6*(i+2)) ? (6*(i+1)) : ((6*(i+1)) + k+1); 
              this.sim.set_spring(    (i*12)+(2*k), (6*i)+k, (6*(i+1)) + k, ks, kd, len); 
              this.sim.set_spring((i*12)+((2*k)+1), (6*i)+k,            p2, ks, kd, len); 
            }
          }
        }

        for(let i = 0; i < 10000; i++) {
          this.sim.special_update(this.time_step, this.top_rim); 
        }
      }

      render_animation( caller )
      {                                                // display():  Called once per frame of animation.  We'll isolate out
        // the code that actually draws things into Assignment2, a
        // subclass of this Scene.  Here, the base class's display only does
        // some initial setup.

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if( !caller.controls )
        { this.animated_children.push( caller.controls = new defs.Movement_Controls( { uniforms: this.uniforms } ) );
          caller.controls.add_mouse_controls( caller.canvas );

          // Define the global camera and projection matrices, which are stored in shared_uniforms.  The camera
          // matrix follows the usual format for transforms, but with opposite values (cameras exist as
          // inverted matrices).  The projection matrix follows an unusual format and determines how depth is
          // treated when projecting 3D points onto a plane.  The Mat4 functions perspective() or
          // orthographic() automatically generate valid matrices for one.  The input arguments of
          // perspective() are field of view, aspect ratio, and distances to the near plane and far plane.

          // !!! Camera changed here
          // TODO: you can change the camera as needed.
          Shader.assign_camera( Mat4.look_at (vec3 (5, 8, 15), vec3 (0, 5, 0), vec3 (0, 1, 0)), this.uniforms );
        }
        this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 1, 100 );

        // *** Lights: *** Values of vector or point lights.  They'll be consulted by
        // the shader when coloring shapes.  See Light's class definition for inputs.
        const t = this.t = this.uniforms.animation_time/1000;

        // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
        // !!! Light changed here
        const light_position = vec4(20, 20, 20, 1.0);
        this.uniforms.lights = [ defs.Phong_Shader.light_source( light_position, color( 1,1,1,1 ), 1000000 ) ];

        // draw axis arrows.
        //this.shapes.axis.draw(caller, this.uniforms, Mat4.identity(), this.materials.rgb);
      }
    }


export class Basketball_Sim extends Basketball_Sim_base
{                                                    
  // **Assignment2** is a Scene object that can be added to any display canvas.
  // This particular scene is broken up into two pieces for easier understanding.
  // See the other piece, My_Demo_Base, if you need to see the setup code.
  // The piece here exposes only the display() method, which actually places and draws
  // the shapes.  We isolate that code so it can be experimented with on its own.
  // This gives you a very small code sandbox for editing a simple scene, and for
  // experimenting with matrix transformations.
  render_animation( caller )
  {                                                // display():  Called once per frame of animation.  For each shape that you want to
    // appear onscreen, place a .draw() call for it inside.  Each time, pass in a
    // different matrix value to control where the shape appears.

    // Variables that are in scope for you to use:
    // this.shapes.box:   A vertex array object defining a 2x2x2 cube.
    // this.shapes.ball:  A vertex array object defining a 2x2x2 spherical surface.
    // this.materials.metal:    Selects a shader and draws with a shiny surface.
    // this.materials.plastic:  Selects a shader and draws a more matte surface.
    // this.lights:  A pre-made collection of Light objects.
    // this.hover:  A boolean variable that changes when the user presses a button.
    // shared_uniforms:  Information the shader needs for drawing.  Pass to draw().
    // caller:  Wraps the WebGL rendering context shown onscreen.  Pass to draw().

    // Call the setup code that we left inside the base class:
    super.render_animation( caller );

    /**********************************
     Start coding down here!!!!
     **********************************/
    // From here on down it's just some example shapes drawn for you -- freely
    // replace them with your own!  Notice the usage of the Mat4 functions
    // translation(), scale(), and rotation() to generate matrices, and the
    // function times(), which generates products of matrices.

    const blue = color( 0,0,1,1 ), yellow = color( 1,0.7,0,1 ), white = color(1, 1, 1, 1), red = color(1, 0, 0, 1),
          wall_color = color( 0.7, .7, 0.7, 1 ), 
          orange = color( 1, 0.5, 0, 1 ),
          blackboard_color = color( .2, .2, .2, 1 );

    const t = this.t = this.uniforms.animation_time/1000;

    //court
    let court_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
    this.shapes.box.draw( caller, this.uniforms, court_transform, { ...this.materials.court } );

    //wall
    const wall_height = 5; 
    // let wall_transform = Mat4.translation(0, wall_height, -10).times(Mat4.scale(10, wall_height, 0.1));
    // this.shapes.box.draw( caller, this.uniforms, wall_transform, { ...this.materials.wall, color: wall_color } );
    // let left_wall_transform = Mat4.translation(-10, wall_height, 0).times(Mat4.scale(.1, wall_height, 10));
    // this.shapes.box.draw( caller, this.uniforms, left_wall_transform, { ...this.materials.wall, color: wall_color } );
    // let right_wall_transform = Mat4.translation(10, wall_height, 0).times(Mat4.scale(.1, wall_height, 10));
    // this.shapes.box.draw( caller, this.uniforms, right_wall_transform, { ...this.materials.wall, color: wall_color } );

    //fence
    let wall_transform = Mat4.translation(0, 5.5, -10).times(Mat4.scale(5.7, 6, 1));
    this.shapes.wall.draw( caller, this.uniforms, wall_transform, { ...this.materials.wall, color: wall_color } );
    let left_wall_transform = Mat4.translation(-10, 5.5, 0)
                                  .times(Mat4.rotation(Math.PI/2, 0, 1, 0))
                                  .times(Mat4.scale(5.7, 6, 1));
    this.shapes.wall.draw( caller, this.uniforms, left_wall_transform, { ...this.materials.wall, color: wall_color } );
    let right_wall_transform = Mat4.translation(10, 5.5, 0)
                                   .times(Mat4.rotation(Math.PI/2, 0, 1, 0))
                                   .times(Mat4.scale(5.7, 6, 1));
    this.shapes.wall.draw( caller, this.uniforms, right_wall_transform, { ...this.materials.wall, color: wall_color } );

    //larger floor
    let floor_transform = Mat4.translation(0, -.05, 0).times(Mat4.scale(100, 0.01, 100));
    this.shapes.box.draw( caller, this.uniforms, floor_transform, { ...this.materials.plastic, color: color(117/255, 95/255, 84/255, 1) } );

    //bench
    let bench_transform_1 = Mat4.translation(-12, 1, 3)
                              .times(Mat4.rotation(Math.PI/2, 0, 1, 0))
                              .times(Mat4.scale(2, 2, 2));
    this.shapes.bench.draw(caller, this.uniforms, bench_transform_1, { ...this.materials.metal, color: color(.9, .9, .9, 1) });
    let bench_transform_2 = Mat4.translation(-12, 1, -3)
                              .times(Mat4.rotation(Math.PI/2, 0, 1, 0))
                              .times(Mat4.scale(2, 2, 2));
    this.shapes.bench.draw(caller, this.uniforms, bench_transform_2, { ...this.materials.metal, color: color(.9, .9, .9, 1) })

    //hoop
    let board_transform = Mat4.translation(0, 7.5, -9.8).times(Mat4.scale(2.25, 1.5, 0.2));
    this.shapes.box.draw( caller, this.uniforms, board_transform, { ...this.materials.backboard }  );
    let board_stand_transform = Mat4.translation(0, 3, -9.8).times(Mat4.scale(.15, 3, 0.2));
    this.shapes.box.draw( caller, this.uniforms, board_stand_transform, { ...this.materials.metal, color:  color(.75, .75, .75, 1) }  );
    let ring_transform =  Mat4.translation(0, 6.5, -8.8)
                          .times( Mat4.rotation(Math.PI/2, 1, 0, 0))
                          .times(Mat4.scale(.75, .75, .05))
    this.shapes.ring.draw(caller, this.uniforms, ring_transform, { ...this.materials.plastic, color: red }  )

    //ball
    // let ball_transform = Mat4.translation(this.ball_location[0], this.ball_location[1], this.ball_location[2])
    //                          .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    // this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.plastic, color: orange } );
    let dt = this.dt = Math.min(1 / 30, this.uniforms.animation_delta_time / 1000);
    dt *= this.sim_speed;

    if (this.running) {
      const t_next = this.t_sim + dt;
      while (this.t_sim < t_next) {
        if(this.shoot) {
          this.update(this.time_step);
        }
        this.sim.special_update(this.time_step, this.top_rim); 
        this.t_sim += this.time_step;
      }
    }

    this.ball.draw(caller, this.uniforms, this.shapes, this.materials, this.shoot, this.time_step, this.force);
    this.sim.draw(caller, this.uniforms, this.shapes, this.materials)

    // console.log("f: " + this.ball.ext_force);
    // console.log("p: " + this.ball.ext_force);

    //confirms ball reaches hoop and passes through net
    if(closeToDest([0, 7.5, -9.8], this.ball.pos))
    {
      this.reachHoop = true;
    }
    if(this.reachHoop)
    {
      if(closeToDest([0, 6.0, -9.8], this.ball.pos))
      {
        this.reachNet = true;
      }
    }
    if (this.reachNet)
    {
      this.score++;
      this.reachHoop = false;
      this.reachNet = false;
      this.scoreText.textContent = "Score: " + this.score;
    }

    //Score Text and Styling
    this.scoreText.style.position = "absolute";
    this.scoreText.style.top = "15px";
    this.scoreText.textContent = "Score: " + this.score;
    this.scoreText.style.fontSize = "20px";
    this.scoreText.style.fontWeight = "bold";
    this.scoreText.style.color = "black";
}

render_controls()
{
// render_controls(): Sets up a panel of interactive HTML elements, including
// buttons with key bindings for affecting this scene, and live info readouts.
this.control_panel.innerHTML += "Assignment 2: IK Engine";

this.scoreText = this.control_panel.appendChild(document.createElement("div"));

this.new_line();
// TODO: You can add your button events for debugging. (optional)
this.key_triggered_button( "Angle Up", ["I"], this.angle_up );
//this.new_line();
this.key_triggered_button( "Angle Right", ["L"], this.angle_right );
//this.new_line();
this.key_triggered_button( "Angle Down", ["K"], this.angle_down );
//this.new_line();
this.key_triggered_button( "Angle Left", ["J"], this.angle_left );
this.new_line();
this.key_triggered_button( "Inc Power", ["P"], this.power_up );
this.key_triggered_button( "Dec Power", ["U"], this.power_down );
this.new_line();
this.key_triggered_button("Shoot", ["O"], () => {
  //this.running = !this.running;
  this.ball.update_arc(this.time_step, this.force, this.spline_length); 
  this.shoot = !this.shoot; 
});
this.new_line();
this.key_triggered_button( "Reset", ["["], this.reset );
this.new_line();
// let difficulty =  "Easy"; 
// if(this.spline_length === 2000)
//   difficulty = "Medium"; 
// if(this.spline_length === 2000)
//   difficulty = "Hard"; 
//this.control_panel.innerHTML += "Difficulty: " + difficulty;
this.new_line();
this.key_triggered_button( "Easy", ["E"], () => { 
  this.spline_length = 5000; 
  this.ball.update_arc(this.time_step, this.force, this.spline_length); 
} );
this.key_triggered_button( "Medium", ["M"], () => { 
  this.spline_length = 2000; 
  this.ball.update_arc(this.time_step, this.force, this.spline_length); 
} );
this.key_triggered_button( "Hard", ["H"], () => { 
  this.spline_length = 1000;   
  this.ball.update_arc(this.time_step, this.force, this.spline_length); 
});
this.new_line();
}

reset() {
  this.ball.pos = vec3(0, 10, -9.8);
  this.ball.acc = vec3(0, 0, 0);
  this.ball.vel = vec3(0, 0, 0);
  this.ball.ext_force = vec3(0, 0, 0);
  //this.running = false;
  this.ball.update_arc(this.time_step, this.force); 
}

update(dt) {
  const ground = vec3(0, .5, 0);
  const ground_normal = vec3(0, 1, 0);
  let front_wall = vec3(0, 0, -10);
  const front_wall_normal = vec3(0, 0, 1);
  const left_wall = vec3(-10, 0, 0);
  const left_wall_normal = vec3(1, 0, 0);
  const right_wall = vec3(10, 0, 0);
  const right_wall_normal = vec3(-1, 0, 0);
  const back_wall = vec3(0, 0, 10);
  const back_wall_normal = vec3(0, 0, -1);

  //see if ball lands in area of backboard 
  if(this.ball.pos[1] >= 5 && this.ball.pos[1] <= 7.5 && this.ball.pos[0] >= -1.125 && this.ball.pos[0] <= 1.125) {
    front_wall = vec3(0, 0, -9.8);
  }
  //see if ball lands in hoop stem/stand
  if(this.ball.pos[1] >= 0 && this.ball.pos[1] <= 3 && this.ball.pos[0] >= -.1 && this.ball.pos[0] <= .1) {
    front_wall = vec3(0, 0, -9.8);
  }
  
  this.ball.ext_force = this.g_acc.times(this.ball.mass);
  this.ball.ext_force.add_by(this.force);
  this.force = vec3(0, 0, 0);
  
  this.ball.calculate_force(ground, ground_normal); // ground
  this.ball.calculate_force(front_wall, front_wall_normal); // front wall
  this.ball.calculate_force(left_wall, left_wall_normal); // left wall
  this.ball.calculate_force(right_wall, right_wall_normal); // right wall
  this.ball.calculate_force(back_wall, back_wall_normal); // back wall
  this.ball.calculate_friction(this.g_acc); 

  this.ball.update(dt);
}

//Simple Functions to adjust ball angle
update_velocity()
{
  this.xVelocity = this.velocity * math.cos(this.LRangle * 3.14/180);
  this.yVelocity = this.velocity * math.sin(this.UDangle * 3.14/180);
  this.zVelocity = this.velocity * math.sin(this.LRangle * 3.14/180);
}

angle_up()
{
  this.force.add_by(vec3(0, 5000, 0));
  this.ball.update_arc(this.time_step, this.force, this.spline_length); 
}
angle_down()
{
  this.force.add_by(vec3(0, -5000, 0));
  this.ball.update_arc(this.time_step, this.force, this.spline_length); 
}
angle_right()
{
  this.force.add_by(vec3(1000, 0, 0));
  this.ball.update_arc(this.time_step, this.force, this.spline_length); 
}
angle_left()
{
  this.force.add_by(vec3(-1000, 0, 0));
  this.ball.update_arc(this.time_step, this.force, this.spline_length); 
}
power_up()
{
  this.force.add_by(vec3(0, 0, -1000));
  this.ball.update_arc(this.time_step, this.force, this.spline_length); 
}
power_down()
{
  if (this.force[2] - 1000 <= 0) {
    this.force.add_by(vec3(0, 0, 1000));
    this.ball.update_arc(this.time_step, this.force, this.spline_length); 
    return;
  }
}
}
