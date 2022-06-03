import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

const shapes = {
    'sphere': new defs.Subdivision_Sphere( 5 ),
};

const EPSILON = 0.001;
const MAX_ITERATION = 10;

export
const Articulated_Human = 
class Articulated_Human {
    constructor() {
        const sphere_shape = shapes.sphere;

        // TA code
        // torso node
        const torso_transform = Mat4.scale(.8, 1.5, 0.7);
        this.torso_node = new Node("torso", sphere_shape, torso_transform);
        // root->torso
        const root_location = Mat4.translation(0, 3.5, 2);
        this.root = new Arc("root", null, this.torso_node, root_location);

        let head_transform = Mat4.scale(0.7, 0.7, 0.7);
        head_transform.pre_multiply(Mat4.translation(0, 0.7, 0));
        this.head_node = new Node("head", sphere_shape, head_transform);

        const neck_loc = Mat4.translation(0, 1.5, 0);
        this.neck = new Arc("neck", this.torso_node, this.head_node, neck_loc);
        this.torso_node.children_arcs.push(this.neck);

        // right upper arm node
        let ru_arm_transform = Mat4.scale(1.2, .2, .2);
        ru_arm_transform.pre_multiply(Mat4.translation(1.2, 0, 0));
        this.ru_arm_node = new Node("ru_arm", sphere_shape, ru_arm_transform);
        // torso->r_shoulder->ru_arm
        const r_shoulder_location = Mat4.translation(0.6, 1.1, 0);
        this.r_shoulder = new Arc("r_shoulder", this.torso_node, this.ru_arm_node, r_shoulder_location);
        this.torso_node.children_arcs.push(this.r_shoulder);

        // right lower arm node
        let rl_arm_transform = Mat4.scale(1, .2, .2);
        rl_arm_transform.pre_multiply(Mat4.translation(1, 0, 0));
        this.rl_arm_node = new Node("rl_arm", sphere_shape, rl_arm_transform);
        // ru_arm->r_elbow->rl_arm
        const r_elbow_location = Mat4.translation(2.4, 0, 0);
        this.r_elbow = new Arc("r_elbow", this.ru_arm_node, this.rl_arm_node, r_elbow_location);
        this.ru_arm_node.children_arcs.push(this.r_elbow);

        // right hand node
        let r_hand_transform = Mat4.scale(.4, .3, .2);
        r_hand_transform.pre_multiply(Mat4.translation(0.4, 0, 0));
        this.r_hand_node = new Node("r_hand", sphere_shape, r_hand_transform);
        // rl_arm->r_wrist->r_hand
        const r_wrist_location = Mat4.translation(2, 0, 0);
        this.r_wrist = new Arc("r_wrist", this.rl_arm_node, this.r_hand_node, r_wrist_location);
        this.rl_arm_node.children_arcs.push(this.r_wrist);

        // left upper arm node
        let lu_arm_transform = Mat4.scale(1.2, .2, .2);
        lu_arm_transform.pre_multiply(Mat4.translation(-1.2, 0, 0));
        this.lu_arm_node = new Node("lu_arm", sphere_shape, lu_arm_transform);
        // torso->l_shoulder->lu_arm
        const l_shoulder_location = Mat4.translation(-0.6, 1.1, 0);
        this.l_shoulder = new Arc("l_shoulder", this.torso_node, this.lu_arm_node, l_shoulder_location);
        this.torso_node.children_arcs.push(this.l_shoulder);

        // left lower arm node
        let ll_arm_transform = Mat4.scale(1, .2, .2);
        ll_arm_transform.pre_multiply(Mat4.translation(-1, 0, 0));
        this.ll_arm_node = new Node("ll_arm", sphere_shape, ll_arm_transform);
        // lu_arm->l_elbow->ll_arm
        const l_elbow_location = Mat4.translation(-2.4, 0, 0);
        this.l_elbow = new Arc("l_elbow", this.lu_arm_node, this.ll_arm_node, l_elbow_location);
        this.lu_arm_node.children_arcs.push(this.l_elbow);

        // left hand node
        let l_hand_transform = Mat4.scale(.4, .3, .2);
        l_hand_transform.pre_multiply(Mat4.translation(-0.4, 0, 0));
        this.l_hand_node = new Node("l_hand", sphere_shape, l_hand_transform);
        // ll_arm->l_wrist->l_hand
        const l_wrist_location = Mat4.translation(-2, 0, 0);
        this.l_wrist = new Arc("l_wrist", this.ll_arm_node, this.l_hand_node, l_wrist_location);
        this.ll_arm_node.children_arcs.push(this.l_wrist);

        this.init_left_leg(); 
        this.init_right_leg(); 

        // degree of freedom 
        this.theta1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.theta2 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        this.update_articulation();
        this.r_end_effector_pos = this.get_current_r_end_effector_pos();
        this.l_end_effector_pos = this.get_current_l_end_effector_pos();
    }

    init_right_leg() {
        const sphere_shape = shapes.sphere;
        //upper leg
        let ru_leg_transform = Mat4.scale(0.3, 1, 0.3); 
        ru_leg_transform.pre_multiply(Mat4.translation(0, -.5, 0)); 
        this.ru_leg_node = new Node("ru_leg", sphere_shape, ru_leg_transform);
        
        const r_hip_loc = Mat4.translation(0.4, -1.75, 0);
        this.r_hip = new Arc("r_hip", this.torso_node, this.ru_leg_node, r_hip_loc);
        this.torso_node.children_arcs.push(this.r_hip);
    
        //foot
        let r_foot_transform = Mat4.scale(0.3, 0.2, 0.4);
        r_foot_transform.pre_multiply(Mat4.translation(0, -.2, 0)); 
        this.r_foot_node = new Node("r_foot", sphere_shape, r_foot_transform);
            
        const r_ankle_loc = Mat4.translation(0, -1.4, 0);
        this.r_ankle = new Arc("r_ankle", this.rl_leg_node, this.r_foot_node, r_ankle_loc);
        this.ru_leg_node.children_arcs.push(this.r_ankle);
      }
    
      init_left_leg() {
        const sphere_shape = shapes.sphere;
        //upper leg
        let lu_leg_transform = Mat4.scale(0.3, 1, 0.3); 
        lu_leg_transform.pre_multiply(Mat4.translation(0, -.5, 0)); 
        this.lu_leg_node = new Node("lu_leg", sphere_shape, lu_leg_transform);
        
        const l_hip_loc = Mat4.translation(-0.4, -1.75, 0);
        this.l_hip = new Arc("r_hip", this.torso_node, this.lu_leg_node, l_hip_loc);
        this.torso_node.children_arcs.push(this.l_hip);
    
        //foot
        let l_foot_transform = Mat4.scale(0.3, 0.2, 0.4);
        l_foot_transform.pre_multiply(Mat4.translation(0, -.2, 0)); 
        this.l_foot_node = new Node("l_foot", sphere_shape, l_foot_transform);
            
        const l_ankle_loc = Mat4.translation(0, -1.4, 0);
        this.l_ankle = new Arc("l_ankle", this.ll_leg_node, this.l_foot_node, l_ankle_loc);
        this.lu_leg_node.children_arcs.push(this.l_ankle);
      }

    update(goal, is_shoot) {
        this.update_right(goal, is_shoot);
        this.update_left(goal, is_shoot);
    }

    move_right_hand_down() {
        const ee_pos = this.get_current_r_end_effector_pos();

        const step = 0.001;
        let end = this.root.location_matrix;
        end = vec3(end[0][3] + 3, end[1][3] - 10, end[2][3]);
        const diff = end.minus(ee_pos).times(step);

        const dx = [[diff[0]], [diff[1]], [diff[2]]];

        const j = this.calculate_jacobian_right();
        const j_inv = this.calculate_inverse(j); // pseudo inverse

        const dtheta = math.multiply(j_inv, dx); // new dof based on the new position

        this.update_right_theta(dtheta);
        this.update_articulation(); // update articulated matrices

        this.r_end_effector_pos = this.get_current_r_end_effector_pos();
    }

    move_left_hand_down() {
        const ee_pos = this.get_current_r_end_effector_pos();

        const step = 0.001;
        let end = this.root.location_matrix;
        end = vec3(end[0][3] - 3, end[1][3] - 10, end[2][3]);
        const diff = end.minus(ee_pos).times(step);

        const dx = [[diff[0]], [diff[1]], [diff[2]]];

        const j = this.calculate_jacobian_left();
        const j_inv = this.calculate_inverse(j); // pseudo inverse

        const dtheta = math.multiply(j_inv, dx); // new dof based on the new position

        this.update_left_theta(dtheta);
        this.update_articulation(); // update articulated matrices

        this.l_end_effector_pos = this.get_current_l_end_effector_pos();
    }

    update_right(goal, is_shoot){
        const step = 0.001;
        let error = goal.minus(this.r_end_effector_pos).norm();
        let iteration_count = 0;

        if (error > 2 && is_shoot) {
            this.move_right_hand_down();
            return;
        }

        while(error > EPSILON && iteration_count < MAX_ITERATION){
            let diff = goal.minus(this.r_end_effector_pos).times(step);
            const dx = [[diff[0]], [diff[1]], [diff[2]]];

            const j = this.calculate_jacobian_right();
            const j_inv = this.calculate_inverse(j); // pseudo inverse

            const dtheta = math.multiply(j_inv, dx); // new dof based on the new position

            this.update_right_theta(dtheta);
            this.update_articulation(); // update articulated matrices

            this.r_end_effector_pos = this.get_current_r_end_effector_pos();

            error = goal.minus(this.r_end_effector_pos).norm();
            iteration_count += 1;
        }
    }

    update_left(goal, is_shoot){
        const step = 0.001;
        let error = goal.minus(this.l_end_effector_pos).norm();
        let iteration_count = 0;

        if (error > 2 && is_shoot) {
            this.move_left_hand_down();
            return;
        }

        while(error > EPSILON && iteration_count < MAX_ITERATION){
            let diff = goal.minus(this.l_end_effector_pos).times(step);
            const dx = [[diff[0]], [diff[1]], [diff[2]]];

            const j = this.calculate_jacobian_left();
            const j_inv = this.calculate_inverse(j); // pseudo inverse

            const dtheta = math.multiply(j_inv, dx); // new dof based on the new position

            //console.log(j)

            this.update_left_theta(dtheta);
            this.update_articulation(); // update articulated matrices

            this.l_end_effector_pos = this.get_current_l_end_effector_pos();

            error = goal.minus(this.l_end_effector_pos).norm();
            iteration_count += 1;
        }
    }

    update_right_theta(delta_dof) {
        this.theta1[0] += delta_dof[0][0];
        this.theta1[1] += delta_dof[1][0];
        this.theta1[2] += delta_dof[2][0];
        this.theta1[3] += delta_dof[3][0];
        this.theta1[4] += delta_dof[4][0];
        this.theta1[5] += delta_dof[5][0];
        this.theta1[6] += delta_dof[6][0];
        this.theta1[7] += delta_dof[7][0];
        this.theta1[8] += delta_dof[8][0];
        this.theta1[9] += delta_dof[9][0];
    }

    update_left_theta(delta_dof) {
        this.theta2[0] += delta_dof[0][0];
        this.theta2[1] += delta_dof[1][0];
        this.theta2[2] += delta_dof[2][0];
        this.theta2[3] += delta_dof[3][0];
        this.theta2[4] += delta_dof[4][0];
        this.theta2[5] += delta_dof[5][0];
        this.theta2[6] += delta_dof[6][0];
        this.theta2[7] += delta_dof[7][0];
        this.theta2[8] += delta_dof[8][0];
        this.theta2[9] += delta_dof[9][0];
    }

    update_articulation() {
        this.root.articulation_matrix = this.get_root_arc(this.theta1[0], this.theta1[1], this.theta1[2]);
        this.r_shoulder.articulation_matrix = this.get_shoulder_arc(this.theta1[3], this.theta1[4], this.theta1[5]);
        this.r_elbow.articulation_matrix = this.get_elbow_arc(this.theta1[6], this.theta1[7]);
        this.r_wrist.articulation_matrix = this.get_wrist_arc(this.theta1[8], this.theta1[9]);

        // this.root.articulation_matrix = this.get_root_arc(this.theta2[0], this.theta2[1], this.theta2[2]);
        this.l_shoulder.articulation_matrix = this.get_shoulder_arc(this.theta2[3], this.theta2[4], this.theta2[5]);
        this.l_elbow.articulation_matrix = this.get_elbow_arc(this.theta2[6], this.theta2[7]);
        this.l_wrist.articulation_matrix = this.get_wrist_arc(this.theta2[8], this.theta2[9]);
    }

    get_root_arc(x, y, z) {
        return Mat4.translation(x, y, z);
    }

    get_shoulder_arc(rx, ry, rz) {
        return Mat4.rotation(rx, 1, 0, 0)
            .pre_multiply(Mat4.rotation(ry, 0, 1, 0))
            .pre_multiply(Mat4.rotation(rz, 0, 0, 1));
    }

    get_elbow_arc(rx, ry) {
        return Mat4.rotation(rx, 1, 0, 0)
            .pre_multiply(Mat4.rotation(ry, 0, 1, 0));
    }

    get_wrist_arc(ry, rz) {
        return Mat4.rotation(ry, 0, 1, 0)
            .pre_multiply(Mat4.rotation(rz, 0, 0, 1));
    }

    // get the new position based on the change in articulated matrices
    get_r_end_effector_pos(root_arc, shoulder_arc, elbow_arc, wrist_arc) {
        let transform_matrix = Mat4.identity().times(this.root.location_matrix)
            .times(root_arc)
            .times(this.r_shoulder.location_matrix)
            .times(shoulder_arc)
            .times(this.r_elbow.location_matrix)
            .times(elbow_arc)
            .times(this.r_wrist.location_matrix)
            .times(wrist_arc)
            .times(this.r_hand_node.transform_matrix);
        let end_effector_loc = transform_matrix.times(vec4(0, 0, 0, 1));

        return end_effector_loc.to3(); 
    }

    get_l_end_effector_pos(root_arc, shoulder_arc, elbow_arc, wrist_arc) {
        let transform_matrix = Mat4.identity().times(this.root.location_matrix)
            .times(root_arc)
            .times(this.l_shoulder.location_matrix)
            .times(shoulder_arc)
            .times(this.l_elbow.location_matrix)
            .times(elbow_arc)
            .times(this.l_wrist.location_matrix)
            .times(wrist_arc)
            .times(this.l_hand_node.transform_matrix);
        let end_effector_loc = transform_matrix.times(vec4(0, 0, 0, 1));

        return end_effector_loc.to3(); 
    }

    get_current_r_end_effector_pos() {
        let ee_loc = this.root.location_matrix
            .times(this.root.articulation_matrix)
            .times(this.r_shoulder.location_matrix)
            .times(this.r_shoulder.articulation_matrix)
            .times(this.r_elbow.location_matrix)
            .times(this.r_elbow.articulation_matrix)
            .times(this.r_wrist.location_matrix)
            .times(this.r_wrist.articulation_matrix)
            .times(this.r_hand_node.transform_matrix);
        ee_loc = vec3(ee_loc[0][3], ee_loc[1][3], ee_loc[2][3]);

        return ee_loc;
    }

    get_current_l_end_effector_pos() {
        let ee_loc = this.root.location_matrix
            .times(this.root.articulation_matrix)
            .times(this.l_shoulder.location_matrix)
            .times(this.l_shoulder.articulation_matrix)
            .times(this.l_elbow.location_matrix)
            .times(this.l_elbow.articulation_matrix)
            .times(this.l_wrist.location_matrix)
            .times(this.l_wrist.articulation_matrix)
            .times(this.l_hand_node.transform_matrix);
        ee_loc = vec3(ee_loc[0][3], ee_loc[1][3], ee_loc[2][3]);

        return ee_loc;
    }

    // make a small change in each dof and the others left unchanged.
    // calculate the new end effector position based on the small dof change.
    // difference of the new and old positions / delta
    // fill out the Jacobian matrix
    calculate_jacobian_right() {
        // delta needs to be very small when all three translational dofs are enabled
        // 0.0000001
        const delta = 0.001;

        let J = new Array(3);
        for (let i = 0; i < 3; i++) {
            J[i] = new Array(10);
        }

        // only move the root along the x-axis a bit and get the new end effector position
        // this would be one column in the Jacobian matrix
        let root_arc = this.get_root_arc(this.theta1[0] + delta, this.theta1[1], this.theta1[2]);
        let root_x = this.get_r_end_effector_pos(root_arc, 
            this.r_shoulder.articulation_matrix, 
            this.r_elbow.articulation_matrix, 
            this.r_wrist.articulation_matrix).minus(this.r_end_effector_pos).times(1 / delta);

        root_arc = this.get_root_arc(this.theta1[0], this.theta1[1] + delta, this.theta1[2]);
        let root_y = this.get_r_end_effector_pos(root_arc, 
            this.r_shoulder.articulation_matrix, 
            this.r_elbow.articulation_matrix, 
            this.r_wrist.articulation_matrix).minus(this.r_end_effector_pos).times(1 / delta);

        root_arc = this.get_root_arc(this.theta1[0], this.theta1[1], this.theta1[2] + delta);
        let root_z = this.get_r_end_effector_pos(root_arc, 
            this.r_shoulder.articulation_matrix, 
            this.r_elbow.articulation_matrix, 
            this.r_wrist.articulation_matrix).minus(this.r_end_effector_pos).times(1 / delta);

        let shoulder_arc = this.get_shoulder_arc(this.theta1[3] + delta, this.theta1[4], this.theta1[5]);
        let shoulder_rx = this.get_r_end_effector_pos(this.root.articulation_matrix,
            shoulder_arc,
            this.r_elbow.articulation_matrix,
            this.r_wrist.articulation_matrix).minus(this.r_end_effector_pos).times(1 / delta);

        shoulder_arc = this.get_shoulder_arc(this.theta1[3], this.theta1[4] + delta, this.theta1[5]);
        let shoulder_ry = this.get_r_end_effector_pos(this.root.articulation_matrix,
            shoulder_arc,
            this.r_elbow.articulation_matrix,
            this.r_wrist.articulation_matrix).minus(this.r_end_effector_pos).times(1 / delta);
                                                           
        shoulder_arc = this.get_shoulder_arc(this.theta1[3], this.theta1[4], this.theta1[5] + delta);
        let shoulder_rz = this.get_r_end_effector_pos(this.root.articulation_matrix,
            shoulder_arc,
            this.r_elbow.articulation_matrix,
            this.r_wrist.articulation_matrix).minus(this.r_end_effector_pos).times(1 / delta);

        let elbow_arc = this.get_elbow_arc(this.theta1[6] + delta, this.theta1[7]);
        let elbow_rx = this.get_r_end_effector_pos(this.root.articulation_matrix,
            this.r_shoulder.articulation_matrix,
            elbow_arc,
            this.r_wrist.articulation_matrix).minus(this.r_end_effector_pos).times(1 / delta);

        elbow_arc = this.get_elbow_arc(this.theta1[6], this.theta1[7] + delta);
        let elbow_ry = this.get_r_end_effector_pos(this.root.articulation_matrix,
            this.r_shoulder.articulation_matrix,
            elbow_arc,
            this.r_wrist.articulation_matrix).minus(this.r_end_effector_pos).times(1 / delta);

        let wrist_arc = this.get_wrist_arc(this.theta1[8] + delta, this.theta1[9]);
        let wrist_ry = this.get_r_end_effector_pos(this.root.articulation_matrix,
            this.r_shoulder.articulation_matrix,
            this.r_elbow.articulation_matrix,
            wrist_arc).minus(this.r_end_effector_pos).times(1 / delta);

        wrist_arc = this.get_wrist_arc(this.theta1[8], this.theta1[9] + delta);
        let wrist_rz = this.get_r_end_effector_pos(this.root.articulation_matrix,
            this.r_shoulder.articulation_matrix,
            this.r_elbow.articulation_matrix,
            wrist_arc).minus(this.r_end_effector_pos).times(1 / delta);

        // Enable translational dof at root
        // Assign 0 to disable
        root_x = vec3(0, 0, 0);
        root_y = vec3(0, 0, 0);
        root_z = vec3(0, 0, 0);
        elbow_rx = vec3(0, 0, 0);

        J[0][0] = root_x[0];
        J[1][0] = root_x[1];
        J[2][0] = root_x[2];

        J[0][1] = root_y[0];
        J[1][1] = root_y[1];
        J[2][1] = root_y[2];

        J[0][2] = root_z[0];
        J[1][2] = root_z[1];
        J[2][2] = root_z[2];

        J[0][3] = shoulder_rx[0];
        J[1][3] = shoulder_rx[1];
        J[2][3] = shoulder_rx[2];

        J[0][4] = shoulder_ry[0];
        J[1][4] = shoulder_ry[1];
        J[2][4] = shoulder_ry[2];

        J[0][5] = shoulder_rz[0];
        J[1][5] = shoulder_rz[1];
        J[2][5] = shoulder_rz[2];

        J[0][6] = elbow_rx[0];
        J[1][6] = elbow_rx[1];
        J[2][6] = elbow_rx[2];

        J[0][7] = elbow_ry[0];
        J[1][7] = elbow_ry[1];
        J[2][7] = elbow_ry[2];

        J[0][8] = wrist_ry[0];
        J[1][8] = wrist_ry[1];
        J[2][8] = wrist_ry[2];

        J[0][9] = wrist_rz[0];
        J[1][9] = wrist_rz[1];
        J[2][9] = wrist_rz[2];

        return J;
    }

    calculate_jacobian_left() {
        const delta = 0.001;

        let J = new Array(3);
        for (let i = 0; i < 3; i++) {
            J[i] = new Array(10);
        }

        let root_arc = this.get_root_arc(this.theta2[0] + delta, this.theta2[1], this.theta2[2]);
        let root_x = this.get_l_end_effector_pos(root_arc, 
            this.l_shoulder.articulation_matrix, 
            this.l_elbow.articulation_matrix, 
            this.l_wrist.articulation_matrix).minus(this.l_end_effector_pos).times(1 / delta);

        root_arc = this.get_root_arc(this.theta2[0], this.theta2[1] + delta, this.theta2[2]);
        let root_y = this.get_l_end_effector_pos(root_arc, 
            this.l_shoulder.articulation_matrix, 
            this.l_elbow.articulation_matrix, 
            this.l_wrist.articulation_matrix).minus(this.l_end_effector_pos).times(1 / delta);

        root_arc = this.get_root_arc(this.theta2[0], this.theta2[1], this.theta2[2] + delta);
        let root_z = this.get_l_end_effector_pos(root_arc, 
            this.l_shoulder.articulation_matrix, 
            this.l_elbow.articulation_matrix, 
            this.l_wrist.articulation_matrix).minus(this.l_end_effector_pos).times(1 / delta);
            
        let shoulder_arc = this.get_shoulder_arc(this.theta2[3] + delta, this.theta2[4], this.theta2[5]);
        const l_shoulder_rx = this.get_l_end_effector_pos(this.root.articulation_matrix,
            shoulder_arc,
            this.l_elbow.articulation_matrix,
            this.l_wrist.articulation_matrix).minus(this.l_end_effector_pos).times(1 / delta);

        shoulder_arc = this.get_shoulder_arc(this.theta2[3], this.theta2[4] + delta, this.theta2[5]);
        const l_shoulder_ry = this.get_l_end_effector_pos(this.root.articulation_matrix,
            shoulder_arc,
            this.l_elbow.articulation_matrix,
            this.l_wrist.articulation_matrix).minus(this.l_end_effector_pos).times(1 / delta);
                                                            
        shoulder_arc = this.get_shoulder_arc(this.theta2[3], this.theta2[4], this.theta2[5] + delta);
        const l_shoulder_rz = this.get_l_end_effector_pos(this.root.articulation_matrix,
            shoulder_arc,
            this.l_elbow.articulation_matrix,
            this.l_wrist.articulation_matrix).minus(this.l_end_effector_pos).times(1 / delta);

        let elbow_arc = this.get_elbow_arc(this.theta2[6] + delta, this.theta2[7]);
        const l_elbow_rx = this.get_l_end_effector_pos(this.root.articulation_matrix,
            this.l_shoulder.articulation_matrix,
            elbow_arc,
            this.l_wrist.articulation_matrix).minus(this.l_end_effector_pos).times(1 / delta);

        elbow_arc = this.get_elbow_arc(this.theta2[6], this.theta2[7] + delta);
        const l_elbow_ry = this.get_l_end_effector_pos(this.root.articulation_matrix,
            this.l_shoulder.articulation_matrix,
            elbow_arc,
            this.l_wrist.articulation_matrix).minus(this.l_end_effector_pos).times(1 / delta);

        let wrist_arc = this.get_wrist_arc(this.theta2[8] + delta, this.theta2[9]);
        const l_wrist_ry = this.get_l_end_effector_pos(this.root.articulation_matrix,
            this.l_shoulder.articulation_matrix,
            this.l_elbow.articulation_matrix,
            wrist_arc).minus(this.l_end_effector_pos).times(1 / delta);

        wrist_arc = this.get_wrist_arc(this.theta2[8], this.theta2[9] + delta);
        const l_wrist_rz = this.get_l_end_effector_pos(this.root.articulation_matrix,
            this.l_shoulder.articulation_matrix,
            this.l_elbow.articulation_matrix,
            wrist_arc).minus(this.l_end_effector_pos).times(1 / delta);

        root_x = vec3(0, 0, 0);
        root_y = vec3(0, 0, 0);
        root_z = vec3(0, 0, 0);

        J[0][0] = root_x[0];
        J[1][0] = root_x[1];
        J[2][0] = root_x[2];

        J[0][1] = root_y[0];
        J[1][1] = root_y[1];
        J[2][1] = root_y[2];

        J[0][2] = root_z[0];
        J[1][2] = root_z[1];
        J[2][2] = root_z[2];

        J[0][3] = l_shoulder_rx[0];
        J[1][3] = l_shoulder_rx[1];
        J[2][3] = l_shoulder_rx[2];

        J[0][4] = l_shoulder_ry[0];
        J[1][4] = l_shoulder_ry[1];
        J[2][4] = l_shoulder_ry[2];

        J[0][5] = l_shoulder_rz[0];
        J[1][5] = l_shoulder_rz[1];
        J[2][5] = l_shoulder_rz[2];

        J[0][6] = l_elbow_rx[0];
        J[1][6] = l_elbow_rx[1];
        J[2][6] = l_elbow_rx[2];

        J[0][7] = l_elbow_ry[0];
        J[1][7] = l_elbow_ry[1];
        J[2][7] = l_elbow_ry[2];

        J[0][8] = l_wrist_ry[0];
        J[1][8] = l_wrist_ry[1];
        J[2][8] = l_wrist_ry[2];

        J[0][9] = l_wrist_rz[0];
        J[1][9] = l_wrist_rz[1];
        J[2][9] = l_wrist_rz[2];

        return J;
    }

    // TA's provided math.js is used
    calculate_inverse(J) {
        const J_T = math.transpose(J);
        const JJ_T = math.multiply(J_T, J);

        if (math.det(JJ_T) === 0) {
            return math.transpose(J);
        } else {
            const J_inv = math.inv(JJ_T);
            return math.multiply(J_inv, J_T)
        }
    }

    // TA code
    draw(webgl_manager, uniforms, material) {
        this.matrix_stack = [];
        this._rec_draw(this.root, Mat4.identity(), webgl_manager, uniforms, material);
    }

    // TA code
    _rec_draw(arc, matrix, webgl_manager, uniforms, material) {
        if (arc !== null) {
            const L = arc.location_matrix;
            const A = arc.articulation_matrix;
            matrix.post_multiply(L.times(A));
            this.matrix_stack.push(matrix.copy());

            const node = arc.child_node;
            const T = node.transform_matrix;
            matrix.post_multiply(T);
            node.shape.draw(webgl_manager, uniforms, matrix, material);

            matrix = this.matrix_stack.pop();
            for (const next_arc of node.children_arcs) {
                this.matrix_stack.push(matrix.copy());
                this._rec_draw(next_arc, matrix, webgl_manager, uniforms, material);
                matrix = this.matrix_stack.pop();
            }
        }
    }
}

// TA code
class Node {
    constructor(name, shape, transform) {
        this.name = name;
        this.shape = shape;
        this.transform_matrix = transform;
        this.children_arcs = [];
    }
}

// TA code
class Arc {
    constructor(name, parent, child, location) {
        this.name = name;
        this.parent_node = parent;
        this.child_node = child;
        this.location_matrix = location;
        this.articulation_matrix = Mat4.identity();
    }
}