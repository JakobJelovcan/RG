import { vec3 } from '../lib/gl-matrix-module.js'
import { avgVec3, vec3PlaneNormal } from './MathHelpers.js';

export class OBB {
    constructor(vertices) {
        this.vertices = vertices;
    }

    transform(globalMatrix) {
        const globalVertices = this.vertices.map(v => vec3.transformMat4(vec3.create(), v, globalMatrix));
        const globalNormals = [
            vec3PlaneNormal(globalVertices[1], globalVertices[0], globalVertices[3]),
            vec3PlaneNormal(globalVertices[4], globalVertices[0], globalVertices[1]),
            vec3PlaneNormal(globalVertices[3], globalVertices[0], globalVertices[4]),
        ];
        const xs = globalVertices.map(v => v[0]);
        const ys = globalVertices.map(v => v[1]);
        const zs = globalVertices.map(v => v[2]);
        const min = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
        const max = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];
        const center = avgVec3(globalVertices);
        return { vertices: globalVertices, normals: globalNormals, center: center, min: min, max: max };
    }    
}