import { vec3, vec4 } from '../lib/gl-matrix-module.js'

export function avgVec3(vectors) {
    const vector = vec3.create();
    for(const vec of vectors) vec3.add(vector, vector, vec);
    return vec3.scale(vector, vector, 1/vectors.length);
}

export function transformMat4(out, a, m) {
    const v = vec4.fromValues(...a, 0);
    vec4.transformMat4(v,v,m);
    out[0] = v[0];
    out[1] = v[1];
    out[2] = v[2];
    return out;
}

export function vec3PlaneNormal(p1, p2, p3) {
    return vec3.normalize(vec3.create(), vec3.cross(vec3.create(), vec3.subtract(vec3.create(), p1, p2), vec3.subtract(vec3.create(), p3, p2)));
}

export function vectorProducts(vectors1, vectors2) {
    let products = [];
    for(const vec1 of vectors1) for(const vec2 of vectors2) products.push(vec3.normalize(vec3.create(), vec3.cross(vec3.create(), vec1, vec2)));
    return products;
}

export function intersectionOnAxis(vertices1, vertices2, axis) {
    const d1 = vertices1.map(v => vec3.dot(v, axis));
    const d2 = vertices2.map(v => vec3.dot(v, axis));
    const min1 = Math.min(...d1);
    const min2 = Math.min(...d2);
    const max1 = Math.max(...d1);
    const max2 = Math.max(...d2);
    const intersection = min1 <= max2 && max1 >= min2;
    const scale = (Math.abs(max2 - min1) < Math.abs(max1 - min2)) ? max2 - min1 : min2 - max1; //The smallest absolute difference in the scalar products
    const offset = vec3.scale(vec3.create(), axis, scale);
    return { intersection: intersection, offset: offset }
}

export function project(v, w) {
    return vec3.scale(vec3.create(), w, vec3.dot(v, w) / vec3.dot(w, w));
}

export function cap(min, val, max) {
    return Math.min(max, Math.max(val, min));
}

export function reflect(n, v) {
    const w = vec3.scale(vec3.create(), n, -2 * vec3.dot(n, v));
    return vec3.sub(w, w, v);
}