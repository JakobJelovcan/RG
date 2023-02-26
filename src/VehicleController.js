import { mat4, quat, vec3 } from '../lib/gl-matrix-module.js';

export class VehicleController {

    constructor(car, carWheels, camera, domElement) {
        this.car = car;
        this.camera = camera;
        this.carWheels = carWheels;
        this.domElement = domElement;
        
        this.keys = {};
        this.pointerSensitivity = 0.002;
        this.lastPointerMove = performance.now();

        this.initHandlers();
    }

    initHandlers() {
        this.pointermoveHandler = this.pointermoveHandler.bind(this);
        this.keydownHandler = this.keydownHandler.bind(this);
        this.keyupHandler = this.keyupHandler.bind(this);

        const element = this.domElement;
        const doc = element.ownerDocument;

        doc.addEventListener('keydown', this.keydownHandler);
        doc.addEventListener('keyup', this.keyupHandler);
        element.addEventListener('click', e => element.requestPointerLock());
        doc.addEventListener('pointerlockchange', e => {
            if (doc.pointerLockElement === element) {
                doc.addEventListener('pointermove', this.pointermoveHandler);
            } else {
                doc.removeEventListener('pointermove', this.pointermoveHandler);
                this.mouseMoved = false;
            }
        });
    }

    update(dt) {
        let steeringAngleDelta = this.car.car.steeringAngle;
        if (this.keys['KeyW'] && !this.car.car.braking) {
            if(this.car.car.velocity >= -0.05) this.car.car.velocity += this.car.car.accelerationFactor * dt;
            else this.car.car.braking = true;
        }
        if (this.keys['KeyS'] && !this.car.car.braking) {
            if(this.car.car.velocity <= 0.05) this.car.car.velocity -= this.car.car.accelerationFactor * dt;
            else this.car.car.braking = true;
        }
        if (this.keys['KeyD']) this.car.car.steeringAngle -= this.car.car.steeringAngleIncrement;
        if (this.keys['KeyA']) this.car.car.steeringAngle += this.car.car.steeringAngleIncrement;

        //Braking
        if(this.car.car.braking) this.car.car.velocity *= Math.exp(dt * Math.log(1 - this.car.car.brakingFactor));

        //Velocity decay
        if (!this.keys['KeyW'] && !this.keys['KeyS']) {
            this.car.car.braking = false;
            this.car.car.velocity *= Math.exp(dt * Math.log(1 - this.car.car.velocityDecay));
        }
        
        //Turning decay
        if(!this.keys['KeyD'] && !this.keys['KeyA']) {
            this.car.car.steeringAngle *= Math.exp(dt * Math.log(1 - this.car.car.steeringDecay));
        }
        steeringAngleDelta = this.car.car.steeringAngle - steeringAngleDelta;

        if(this.car.car.steeringAngle > 0.01 || this.car.car.steeringAngle < -0.01) {
            const distance = this.car.car.velocity * dt;
            const rotationMatrix = mat4.create();
            mat4.translate(rotationMatrix, rotationMatrix, this.car.car.rotationCenter);
            mat4.rotateY(rotationMatrix, rotationMatrix, distance / this.car.car.turningRadius)
            mat4.translate(rotationMatrix, rotationMatrix, this.car.car.rotationCenterInv);
            
            //The rotation of the car is performed in the local space
            //Car's rotation matrix is then multiplied by the local matrix of the car
            this.car.localMatrix = mat4.multiply(mat4.create(), this.car.localMatrix, rotationMatrix);
        }
        else {
            const forward = this.car.forward;
            vec3.transformQuat(forward, forward, this.car.rotation);
            const velocity = vec3.create();
            vec3.scale(velocity, forward, this.car.car.velocity);
            this.car.translation = vec3.scaleAndAdd(vec3.create(),  this.car.translation, velocity, dt);
        }
        this.rotateWheels(dt, steeringAngleDelta);
        this.moveCamera(dt);
    }
    
    rotateWheels(dt) {
        const leftWheelAnchorRotation = quat.create();
        this.carWheels.frontLeftWheel.parent.rotation = quat.rotateY(leftWheelAnchorRotation, leftWheelAnchorRotation, this.car.car.steeringAngle);
        const rightWheelAnchorRotation = quat.create();
        this.carWheels.frontRightWheel.parent.rotation = quat.rotateY(rightWheelAnchorRotation, rightWheelAnchorRotation, this.car.car.steeringAngle);

        const R = 0.1;
        const distance = this.car.car.velocity * dt;

        const leftWheelMat = this.carWheels.frontLeftWheel.localMatrix;
        mat4.rotateX(leftWheelMat, leftWheelMat, distance / R);
        this.carWheels.frontLeftWheel.localMatrix = leftWheelMat;

        const rightWheelMat = this.carWheels.frontRightWheel.localMatrix;
        mat4.rotateX(rightWheelMat, rightWheelMat, distance / R);
        this.carWheels.frontRightWheel.localMatrix = rightWheelMat;

        const rightBackWheelMat = this.carWheels.backRightWheel.localMatrix;
        mat4.rotateX(rightBackWheelMat, rightBackWheelMat, distance / R);
        this.carWheels.backRightWheel.localMatrix = rightBackWheelMat;

        const leftBackWheelMat = this.carWheels.backLeftWheel.localMatrix;
        mat4.rotateX(leftBackWheelMat, leftBackWheelMat, distance / R);
        this.carWheels.backLeftWheel.localMatrix = leftBackWheelMat;
    }
    
    moveCamera(dt) {
        //Move camera towards it's default position
        const scale = Math.exp(dt * Math.log(0.05));
        this.camera.translation = vec3.lerp(vec3.create(), this.camera.defaultPosition, this.camera.translation, scale);;

        const rotation = this.camera.parent.customRotation;
        if(performance.now() - this.lastPointerMove > 500) rotation.scale(scale);
        this.camera.parent.rotation = rotation.getRotation();
    }

    keydownHandler(e) {
        this.keys[e.code] = true;
    }

    keyupHandler(e) {
        this.keys[e.code] = false;
    }

    pointermoveHandler(e) {
        this.lastPointerMove = performance.now();
        const dx = e.movementX;
        const dy = e.movementY;
        const rotation = this.camera.parent.customRotation;
        rotation.pitch -= dy * this.pointerSensitivity;
        rotation.yaw   -= dx * this.pointerSensitivity;

    }
}