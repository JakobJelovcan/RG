import { mat4, vec3, quat } from "../lib/gl-matrix-module.js";
import { vectorProducts, intersectionOnAxis, transformMat4, project, cap, reflect } from "./MathHelpers.js";

export class Physics {
    constructor(scenes) {
        this.scenes = scenes;
    }

    moveNode(node, dt) {
        if(node.animated) {
            const translation = node.translation;
            vec3.scaleAndAdd(translation, translation, node.velocity, dt);
            node.translation = translation;
            this.resolveSceneColisions(node, dt);
        }
    }

    resolveSceneColisions(movedNode, dt, ignore = null) {
        let colission = false;
        for(const scene of this.scenes) for(const node of scene.nodes) if(node != ignore && node != movedNode) colission |= this.resolveNodeColisions(movedNode, node, dt, ignore);
        return colission;
    }

    resolveNodeColisions(movedNode, node, dt, ignore = null) {
        if(node.colidable && this.resolveColision(movedNode, node, dt)) return true;
        else {
            let colission = false;
            for(let child of node.children) if(child != ignore && child != movedNode) colission |= this.resolveNodeColisions(movedNode, child, dt, ignore);
            return colission;
        }
    }

    resolveColision(movedNode, node, dt) {
        const box1 = movedNode.globalOBB;
        const box2 = node.globalOBB;
        if(box1.min[0] > box2.max[0] || box1.max[0] < box2.min[0] || box1.min[1] > box2.max[1] || box1.max[1] < box2.min[1] || box1.min[2] > box2.max[2] || box1.max[2] < box2.min[2]) return false;
        const axes = 
        [
            ...box1.normals,
            ...box2.normals,
            ...vectorProducts(box1.normals, box2.normals)
        ];
        const intersections = axes.filter(a => vec3.length(a) > 0).map(n => intersectionOnAxis(box1.vertices, box2.vertices, n));
        const intersection = intersections.every(i => i.intersection);
        if(intersection) {
            let minIndex = 0;
            for(let i = 0; i < intersections.length; ++i) if(vec3.length(intersections[minIndex].offset) > vec3.length(intersections[i].offset)) minIndex = i;
            
            const offset = intersections[minIndex].offset;

            //If the object being hit is movable
            if(node.movable) {
                const obj1Mass = movedNode.mass;
                const obj2Mass = node.mass;
                const obj1Offset = vec3.scale(vec3.create(), offset, obj2Mass / (obj1Mass + obj2Mass));
                const obj2Offset = vec3.scale(vec3.create(), offset, -obj1Mass / (obj1Mass + obj2Mass));
                this.moveNodeByGlobalOffset(movedNode, obj1Offset);
                this.moveNodeByGlobalOffset(node, obj2Offset);
                this.resolveSceneColisions(node, dt, movedNode);
                if(movedNode.car) movedNode.car.velocity *= Math.exp(dt * Math.log(obj2Mass / (obj1Mass + obj2Mass)))
                return intersection;
            }
            else {
                if(movedNode.camera) this.moveCameraByGlobalOffset(movedNode, offset)
                else this.moveNodeByGlobalOffset(movedNode, offset);
            }
            if(movedNode.animated) this.reflectNodeVelocity(movedNode, offset);
            else this.decreaseNodeVelocity(movedNode, offset);
        }
        return intersection;
    }

    moveNodeByGlobalOffset(movedNode, offset) {
        const translation = vec3.clone(offset);
        const parentGlobalMatrix = movedNode.parentMatrix;
        mat4.invert(parentGlobalMatrix, parentGlobalMatrix);
        transformMat4(translation, translation, parentGlobalMatrix);
        const localTranslation = movedNode.translation;
        vec3.add(localTranslation, localTranslation, translation);
        movedNode.translation = localTranslation;
    }

    moveCameraByGlobalOffset(cameraNode, offset) {
        const cameraAnchor = cameraNode.parent;
        const rotation = cameraAnchor.customRotation;
        const translation = vec3.clone(offset);
        const toCamera = cameraNode.translation;
        const parentGlobalMatrix = cameraNode.parentMatrix;
        mat4.invert(parentGlobalMatrix, parentGlobalMatrix);
        transformMat4(translation, translation, parentGlobalMatrix);

        const toCameraNormalized = vec3.normalize(vec3.create(), toCamera);
        const zProj = project(translation, vec3.fromValues(0,0,1));
        const xProj = project(translation, vec3.fromValues(1,0,0));
        const yProj = project(translation, vec3.fromValues(0,1,0));

        vec3.add(xProj, xProj, toCamera);
        vec3.add(yProj, yProj, toCamera);
        vec3.normalize(xProj, xProj);
        vec3.normalize(yProj, yProj);
        const dotY = cap(-1, vec3.dot(yProj, toCameraNormalized), 1);
        const dotX = cap(-1, vec3.dot(xProj, toCameraNormalized), 1);
        const ySign = Math.sign(vec3.dot(yProj, vec3.fromValues(0,-1,0)))
        const xSign = Math.sign(vec3.dot(xProj, vec3.fromValues(-1,0,0)))
        rotation.pitch += Math.acos(dotY) * ySign;
        rotation.yaw += Math.acos(dotX) * xSign;
        
        cameraAnchor.rotation = rotation.getRotation();

        const cameraTranslation = cameraNode.translation;
        vec3.add(cameraTranslation, cameraTranslation, zProj);
        if(vec3.length(cameraTranslation) > 2.5) vec3.scale(cameraTranslation, cameraTranslation, 3 / vec3.length(cameraTranslation));
        cameraNode.translation = cameraTranslation;
    }

    decreaseNodeVelocity(node, offset) {
        const forward = node.forward;
        const rotation = mat4.getRotation(quat.create(), node.globalMatrix);
        vec3.transformQuat(forward, forward, rotation);
        const dot = vec3.dot(forward, vec3.normalize(vec3.create(), offset));
        if(node.car) node.car.velocity *= 1 - Math.abs(dot);
        else node.velocity = vec3.scale(vec3.create(), node.velocity, dot);
    }

    reflectNodeVelocity(node, offset) {
        const parentGlobalMatrix = node.parentMatrix;
        const translation = vec3.clone(offset);
        transformMat4(translation, translation, parentGlobalMatrix);
        const newVelocity = reflect(translation, node.velocity);
        vec3.normalize(newVelocity, newVelocity);
        node.velocity = vec3.scale(newVelocity, newVelocity, 0.2);
    }
}