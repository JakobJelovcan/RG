import { quat } from "../lib/gl-matrix-module.js";

export class Rotation {
    constructor(yaw = 0, pitch = 0) {
        this._yaw = yaw;
        this._pitch = pitch;
        this.TWO_PI = Math.PI * 2;
        this.HALF_PI = Math.PI / 2;
    }

    scale(x) {
        this.pitch *= x;
        if(this.yaw < Math.PI) this.yaw *= x;
        else this.yaw = this.TWO_PI - (this.TWO_PI - this.yaw) * x;
    }

    getRotation() {
        const rotation = quat.create();
        quat.rotateY(rotation, rotation, this.yaw);
        quat.rotateX(rotation, rotation, this.pitch);
        return rotation;
    }

    get yaw() {
        return this._yaw;
    }

    set yaw(val) {
        this._yaw = (val % this.TWO_PI + this.TWO_PI) % this.TWO_PI;
    }

    get pitch() {
        return this._pitch;
    }

    set pitch(val) {
        this._pitch = Math.min(this.HALF_PI, Math.max(-0.4, val));
    }
}