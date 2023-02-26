import { vec3 } from "../lib/gl-matrix-module.js";

export class Car {
    constructor(extras = {}) {
        this.extras = extras;
        this._up = this.extras.up;
        this._forward = this.extras.forward;
        this._velocity = 0.0;
        this._steeringAngle = 0.0;
        this._braking = false;
    }

    get accelerationFactor() {
        return this.extras.accelerationFactor;
    }

    get steeringAngle() {
        return this._steeringAngle;
    }

    set steeringAngle(angle) {
        this._steeringAngle = (Math.abs(angle) > this.extras.maxSteeringAngle) ? Math.sign(angle) * this.extras.maxSteeringAngle : angle;
    }

    get steeringAngleIncrement() {
        return this.extras.maxSteeringAngle / 100.0;
    }
    
    get velocity() {
        return this._velocity;
    }

    set velocity(velocity) {
        this._velocity = (Math.abs(velocity) > this.extras.maxVelocity) ? Math.sign(velocity) * this.extras.maxVelocity : velocity;
    }

    get velocityDecay() {
        return this.extras.velocityDecay;
    }

    get braking() {
        return this._braking;
    }

    set braking(val) {
        this._braking = val;
    }
    
    get brakingFactor() {
        return 0.97;
    }

    get turningRadius() {
        return this.axleDistance / Math.sin(this.steeringAngle);
    }

    get rotationCenter() {
        return vec3.fromValues(this.turningRadius, 0.0, 0.0);
    }

    get rotationCenterInv() {
        return vec3.fromValues(-this.turningRadius, 0.0, 0.0);
    }

    get axleDistance() {
        return this.extras.axleDistance;
    }

    get steeringDecay() {
        return this.extras.steeringDecay;
    }

    get frontLeftWheelName() {
        return this.extras.frontLeftWheelName;
    }

    get frontRightWheelName() {
        return this.extras.frontRightWheelName;
    }

    get backRightWheelName() {
        return this.extras.backRightWheelName;
    }

    get backLeftWheelName() {
        return this.extras.backLeftWheelName;
    }
}