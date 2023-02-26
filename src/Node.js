import { vec3, mat4, quat } from '../lib/gl-matrix-module.js';

export class Node {

    constructor(options = {}) {
        this._translation = options.translation
            ? vec3.clone(options.translation)
            : vec3.fromValues(0, 0, 0);
        this._rotation = options.rotation
            ? quat.clone(options.rotation)
            : quat.fromValues(0, 0, 0, 1);
        this._scale = options.scale
            ? vec3.clone(options.scale)
            : vec3.fromValues(1, 1, 1);
        this._matrix = options.matrix
            ? mat4.clone(options.matrix)
            : mat4.create();
        this._parentMatrix;
        this._name = options.name;
        this._obb = options.obb;
        this._globalOBB;
        this._up = (options.extras !== undefined && options.extras.up !== undefined) ? options.extras.up : vec3.fromValues(0, 1, 0);
        this._forward = (options.extras !== undefined && options.extras.forward !== undefined) ? options.extras.forward : vec3.fromValues(0, 0, 1);
        this._velocity = vec3.create(0, 0, 0);
        this._defaultPosition = (options.extras !== undefined && options.extras.defaultPosition) ? options.extras.defaultPosition : vec3.create();

        if (options.matrix) {
            this.updateTransformationComponents();
        } else if (options.translation || options.rotation || options.scale) {
            this.updateTransformationMatrix();
        }

        this.transformationMatrixNeedsUpdate = false;
        this.transformationComponentsNeedUpdate = false;
        this.globalOBBNeedsUpdate = true;
        this.parentMatrixNeedsUpdate = true;

        this.camera = options.camera || null;
        this.mesh = options.mesh || null;
        this.light = options.light || null;
        this.car = options.car || null;
        this.customRotation = options.customRotation || null;
        this.movable = (options.extras && options.extras.movable == 'true');
        this.animated = (options.extras && options.extras.animated == 'true');
        this.renderable = (options.extras && options.extras.renderable == 'true');
        this.mass = (options.extras && options.extras.mass) ? options.extras.mass : 100000;
        this.colidable = (options.extras && options.extras.colidable == 'true');

        this.children = [...(options.children || [])];
        for (const child of this.children) {
            child.parent = this;
        }
        this.parent = null;
    }

    updateTransformationComponents() {
        mat4.getRotation(this._rotation, this._matrix);
        mat4.getTranslation(this._translation, this._matrix);
        mat4.getScaling(this._scale, this._matrix);

        this.transformationComponentsNeedUpdate = false;
    }

    updateTransformationMatrix() {
        mat4.fromRotationTranslationScale(
            this._matrix,
            this._rotation,
            this._translation,
            this._scale);

        this.transformationMatrixNeedsUpdate = false;
    }

    get translation() {
        if (this.transformationComponentsNeedUpdate) {
            this.updateTransformationComponents();
        }
        return vec3.clone(this._translation);
    }

    set translation(translation) {
        if (this.transformationComponentsNeedUpdate) {
            this.updateTransformationComponents();
        }
        this._translation = vec3.clone(translation);
        this.transformationMatrixNeedsUpdate = true;
        this.globalOBBNeedsUpdate = true;
        this.traverse(n=>n.parentMatrixNeedsUpdate = n.globalOBBNeedsUpdate = true);
    }

    get rotation() {
        if (this.transformationComponentsNeedUpdate) {
            this.updateTransformationComponents();
        }
        return quat.clone(this._rotation);
    }

    set rotation(rotation) {
        if (this.transformationComponentsNeedUpdate) {
            this.updateTransformationComponents();
        }
        this._rotation = quat.clone(rotation);
        this.transformationMatrixNeedsUpdate = true;
        this.globalOBBNeedsUpdate = true;
        this.traverse(n=>n.parentMatrixNeedsUpdate = n.globalOBBNeedsUpdate = true);
    }

    get scale() {
        if (this.transformationComponentsNeedUpdate) {
            this.updateTransformationComponents();
        }
        return vec3.clone(this._scale);
    }

    set scale(scale) {
        if (this.transformationComponentsNeedUpdate) {
            this.updateTransformationComponents();
        }
        this._scale = vec3.clone(scale);
        this.transformationMatrixNeedsUpdate = true;
        this.globalOBBNeedsUpdate = true;
        this.traverse(n=>n.parentMatrixNeedsUpdate = n.globalOBBNeedsUpdate = true);
    }

    get localMatrix() {
        if (this.transformationMatrixNeedsUpdate) {
            this.updateTransformationMatrix();
        }
        return mat4.clone(this._matrix);
    }

    set localMatrix(matrix) {
        this._matrix = mat4.clone(matrix);
        this.transformationComponentsNeedUpdate = true;
        this.transformationMatrixNeedsUpdate = false;
        this.globalOBBNeedsUpdate = true;
        this.traverse(n=>n.parentMatrixNeedsUpdate = n.globalOBBNeedsUpdate = true);
    }

    get globalMatrix() {
        if (this.parent) {
            const globalMatrix = this.parentMatrix;
            this.parentMatrixNeedsUpdate = false;
            return mat4.multiply(globalMatrix, globalMatrix, this.localMatrix);
        } else {
            return this.localMatrix;
        }
    }

    get parentMatrix() {
        if(this.parent) {
            if(this.parentMatrixNeedsUpdate) {
                this.parentMatrixNeedsUpdate = false;
                this._parentMatrix = this.parent.globalMatrix;
            }
            return mat4.clone(this._parentMatrix);
        }
        else {
            return mat4.create();
        }
    }

    get forward() {
        return vec3.clone(this._forward);
    }

    get up() {
        return vec3.clone(this._up);
    }

    get velocity() {
        return vec3.clone(this._velocity);
    }

    set velocity(val) {
        this._velocity = val;
    }

    get defaultPosition() {
        return this._defaultPosition;
    }

    get name() {
        return this._name;
    }
    
    get globalOBB() {
        if(this.globalOBBNeedsUpdate) {
            this._globalOBB = this._obb.transform(this.globalMatrix);
            this.globalOBBNeedsUpdate = false;
        }
        return this._obb.transform(this.globalMatrix);
    }

    addChild(node) {
        if (node.parent) {
            node.parent.removeChild(node);
        }

        this.children.push(node);
        node.parent = this;
    }
    
    removeChild(node) {
        const index = this.children.indexOf(node);
        if (index >= 0) {
            this.children.splice(index, 1);
            node.parent = null;
        }
    }

    getChild(name) {
        for(let child of this.children) {
            if(child.name == name) return child;
        }
        return null;
    }

    traverse(before, after) {
        if (before) {
            before(this);
        }
        for (const child of this.children) {
            child.traverse(before, after);
        }
        if (after) {
            after(this);
        }
    }

    setRandomVelocity() {
        const velocity = vec3.fromValues(Math.random(), Math.random() * 0.2, Math.random());
        vec3.normalize(velocity, velocity);
        vec3.scale(velocity, velocity, 0.2)
        this.velocity = velocity;
    }
}