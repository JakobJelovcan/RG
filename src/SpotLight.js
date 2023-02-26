export class SpotLight {
    constructor(options = {}) {
        this.color = options.color;
        this.attenuation = [0.01, 0.1, 1];
        this.angularAttenuation = 4.0;
    }
}