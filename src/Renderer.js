import { vec2, vec3, mat4, quat, mat2 } from '../lib/gl-matrix-module.js';

import { WebGL } from '../../common/engine/WebGL.js';

import { shaders } from './Shaders.js';
import { SpotLight } from './SpotLight.js';
import { DirectionalLight } from './DirectionalLight.js'

// This class prepares all assets for use with WebGL
// and takes care of rendering.

export class Renderer {

    constructor(gl) {
        this.gl = gl;
        this.glObjects = new Map();
        this.programs = WebGL.buildPrograms(gl, shaders);

        gl.clearColor(1, 1, 1, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        this.defaultDiffuseTexture = WebGL.createTexture(gl, {
            width: 1,
            height: 1,
            data: new Uint8Array([255, 255, 255, 255]),
        });

        this.defaultNormalTexture = WebGL.createTexture(gl, {
            width: 1,
            height: 1,
            data: new Uint8Array([128, 255, 128, 255]),
        });

        this.defaultDiffuseSampler = WebGL.createSampler(gl, {
            min: gl.NEAREST,
            mag: gl.NEAREST,
            wrapS: gl.CLAMP_TO_EDGE,
            wrapT: gl.CLAMP_TO_EDGE,
        });
        
        this.defaultNormalSampler = WebGL.createSampler(gl, {
            min: gl.NEAREST,
            mag: gl.NEAREST,
            wrapS: gl.CLAMP_TO_EDGE,
            wrapT: gl.CLAMP_TO_EDGE,
        });
    }

    enableBlending() {
        const gl = this.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    disableBlending() {
        const gl = this.gl;
        gl.disable(gl.BLEND);
    }

    prepareBufferView(bufferView) {
        if (this.glObjects.has(bufferView)) {
            return this.glObjects.get(bufferView);
        }

        const buffer = new DataView(
            bufferView.buffer,
            bufferView.byteOffset,
            bufferView.byteLength);
        const glBuffer = WebGL.createBuffer(this.gl, {
            target : bufferView.target,
            data   : buffer
        });
        this.glObjects.set(bufferView, glBuffer);
        return glBuffer;
    }

    prepareSampler(sampler) {
        if (this.glObjects.has(sampler)) {
            return this.glObjects.get(sampler);
        }

        const glSampler = WebGL.createSampler(this.gl, sampler);
        this.glObjects.set(sampler, glSampler);
        return glSampler;
    }

    prepareImage(image) {
        if (this.glObjects.has(image)) {
            return this.glObjects.get(image);
        }

        const glTexture = WebGL.createTexture(this.gl, { image });
        this.glObjects.set(image, glTexture);
        return glTexture;
    }

    prepareTexture(texture) {
        const gl = this.gl;

        this.prepareSampler(texture.sampler);
        const glTexture = this.prepareImage(texture.image);

        const mipmapModes = [
            gl.NEAREST_MIPMAP_NEAREST,
            gl.NEAREST_MIPMAP_LINEAR,
            gl.LINEAR_MIPMAP_NEAREST,
            gl.LINEAR_MIPMAP_LINEAR,
        ];

        if (!texture.hasMipmaps && mipmapModes.includes(texture.sampler.min)) {
            gl.bindTexture(gl.TEXTURE_2D, glTexture);
            gl.generateMipmap(gl.TEXTURE_2D);
            texture.hasMipmaps = true;
        }
    }

    prepareMaterial(material) {
        if (material.baseColorTexture) {
            this.prepareTexture(material.baseColorTexture);
        }
        if (material.metallicRoughnessTexture) {
            this.prepareTexture(material.metallicRoughnessTexture);
        }
        if (material.normalTexture) {
            this.prepareTexture(material.normalTexture);
        }
        if (material.occlusionTexture) {
            this.prepareTexture(material.occlusionTexture);
        }
        if (material.emissiveTexture) {
            this.prepareTexture(material.emissiveTexture);
        }
    }

    preparePrimitive(primitive) {
        if (this.glObjects.has(primitive)) {
            return this.glObjects.get(primitive);
        }

        this.prepareMaterial(primitive.material);

        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        if (primitive.indices) {
            const bufferView = primitive.indices.bufferView;
            bufferView.target = gl.ELEMENT_ARRAY_BUFFER;
            const buffer = this.prepareBufferView(bufferView);
            gl.bindBuffer(bufferView.target, buffer);
        }

        // this is an application-scoped convention, matching the shader
        const attributeNameToIndexMap = {
            POSITION   : 0,
            NORMAL     : 1,
            TANGENT    : 2,
            TEXCOORD_0 : 3,
            TEXCOORD_1 : 4,
            COLOR_0    : 5,
        };

        for (const name in primitive.attributes) {
            const accessor = primitive.attributes[name];
            const bufferView = accessor.bufferView;
            const attributeIndex = attributeNameToIndexMap[name];

            if (attributeIndex !== undefined) {
                bufferView.target = gl.ARRAY_BUFFER;
                const buffer = this.prepareBufferView(bufferView);
                gl.bindBuffer(bufferView.target, buffer);
                gl.enableVertexAttribArray(attributeIndex);
                gl.vertexAttribPointer(
                    attributeIndex,
                    accessor.numComponents,
                    accessor.componentType,
                    accessor.normalized,
                    bufferView.byteStride,
                    accessor.byteOffset);
            }
        }

        this.glObjects.set(primitive, vao);
        return vao;
    }

    prepareMesh(mesh) {
        for (const primitive of mesh.primitives) {
            this.preparePrimitive(primitive);
        }
    }

    prepareNode(node) {
        if (node.mesh) {
            this.prepareMesh(node.mesh);
        }
        for (const child of node.children) {
            this.prepareNode(child);
        }
    }

    prepareScene(scene) {
        for (const node of scene.nodes) {
            this.prepareNode(node);
        }
    }

    prepareMiniMap() {
        const gl = this.gl;
        this.miniMapResolution = 256;
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        const texture = WebGL.createTexture(gl, { width: this.miniMapResolution, height: this.miniMapResolution, min: gl.LINEAR, mag: gl.LINEAR });
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        

        const renderBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, this.miniMapResolution, this.miniMapResolution);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(
            [
                -0.4, 0.0, 0, 0,
                0.0, 0.0, 1, 0,
                -0.4, 0.4, 0, 1,
                0.0, 0.4, 1, 1,
            ]
        ), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

        this.miniMap = 
        {
            framebuffer: framebuffer,
            texture: texture,
            vao: vao,
            offset: vec2.fromValues(0.9, -0.9)
        };
    }

    async prepareOverlay() {
        const gl = this.gl;

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(
            [
                -0.5, 0.0, 0, 1,
                0.5, 0.0, 1, 1,
                -0.5, 0.5, 0, 0,
                0.5, 0.5, 1, 0,
            ]
        ), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

        const image = await fetch('../../models/ChestFound.png');
        const blob = await image.blob();
        const bitmap = await createImageBitmap(blob);

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        this.overlay = 
        {
            vao: vao,
            texture: texture,
            offset: vec2.fromValues(0.0, 0.0),
        };
    }

    getViewProjectionMatrix(camera) {
        const mvpMatrix = camera.globalMatrix;
        mat4.invert(mvpMatrix, mvpMatrix);
        mat4.mul(mvpMatrix, camera.camera.matrix, mvpMatrix);
        return mvpMatrix;
    }

    loadSceneUniforms(uniforms, camera, ambientLight = [0.0, 0.0, 0.0], lights = {}) {
        const gl = this.gl;
        if('uAmbientLight' in uniforms) gl.uniform3fv(uniforms.uAmbientLight, ambientLight);
        if('uCameraPosition' in uniforms) gl.uniform3fv(uniforms.uCameraPosition, mat4.getTranslation(vec3.create(), camera.globalMatrix));
        if('uViewProjection' in uniforms) gl.uniformMatrix4fv(uniforms.uViewProjection, false, this.getViewProjectionMatrix(camera));


        for(const [name, light] of Object.entries(lights)) {
            const shaderLightName = `u${name.charAt(0).toUpperCase()}${name.slice(1)}`;
            if(shaderLightName in uniforms) {
                if(light.light instanceof DirectionalLight) this.loadDirectionalLight(uniforms[shaderLightName], light);
                else if(light.light instanceof SpotLight) this.loadSpotLight(uniforms[shaderLightName], light);
            }
        }
    }

    loadNodeUniforms(uniforms, node) {
        const gl = this.gl;
        if('uModel' in uniforms) gl.uniformMatrix4fv(uniforms.uModel, false, node.globalMatrix);
    }

    loadPrimitiveUniforms(uniforms, primitive) {
        const gl = this.gl;
        const material = primitive.material;
        if('uMaterial' in uniforms) {
            if('baseColorFactor' in uniforms.uMaterial) gl.uniform4fv(uniforms.uMaterial.baseColorFactor, material.baseColorFactor);
            if('emissiveFactor' in uniforms.uMaterial) gl.uniform3fv(uniforms.uMaterial.emissiveFactor, material.emissiveFactor);
            if('roughnessFactor' in uniforms.uMaterial) gl.uniform1f(uniforms.uMaterial.roughnessFactor, material.roughnessFactor);
    
            if('baseColorTexture' in uniforms.uMaterial) {
                gl.activeTexture(gl.TEXTURE0);
                gl.uniform1i(uniforms.uMaterial.baseColorTexture, 0);
        
                const diffuseTexture = material.baseColorTexture;
                const glDiffuseTexture = diffuseTexture ? this.glObjects.get(diffuseTexture.image) : this.defaultDiffuseTexture;
                const glDiffuseSampler = diffuseTexture ? this.glObjects.get(diffuseTexture.sampler) : this.defaultDiffuseSampler;
        
                gl.bindTexture(gl.TEXTURE_2D, glDiffuseTexture);
                gl.bindSampler(0, glDiffuseSampler);
            }

            if('normalTexture' in uniforms.uMaterial) {
                gl.activeTexture(gl.TEXTURE1);
                gl.uniform1i(uniforms.uMaterial.normalTexture, 1);
        
                const normalTexture = material.normalTexture;
                const glnormalTexture = normalTexture ? this.glObjects.get(normalTexture.image) : this.defaultNormalTexture;
                const glNormalSampler = normalTexture ? this.glObjects.get(normalTexture.sampler) : this.defaultDiffuseSampler;

                gl.bindTexture(gl.TEXTURE_2D, glnormalTexture);
                gl.bindSampler(1, glNormalSampler);
            }
        }
    }

    loadDirectionalLight(uniform, light) {
        const globalMatrix = light.globalMatrix;
        const direction = light.forward;
        const intensity = light.light.color;
        
        vec3.transformQuat(direction, direction, mat4.getRotation(quat.create(), globalMatrix));
        
        this.gl.uniform3fv(uniform.direction, direction);
        this.gl.uniform3fv(uniform.intensity, intensity);
    }
    
    loadSpotLight(uniform, light) {
        const globalMatrix = light.globalMatrix;
        const direction = light.forward;
        const intensity = light.light.color;
        const position = mat4.getTranslation(vec3.create(), globalMatrix);
        const attenuation = light.light.attenuation;
        const angularAttenuation = light.light.angularAttenuation;
        vec3.transformQuat(direction, direction, mat4.getRotation(quat.create(), globalMatrix));
        
        this.gl.uniform3fv(uniform.direction, direction);
        this.gl.uniform3fv(uniform.position, position);
        this.gl.uniform3fv(uniform.intensity, intensity);
        this.gl.uniform3fv(uniform.attenuation, attenuation);
        this.gl.uniform1f(uniform.angularAttenuation, angularAttenuation);
    }

    renderMiniMapTexture(scenes, camera, ambientLight, lights) {
        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.miniMap.framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, this.miniMapResolution, this.miniMapResolution);

        for (const scene of scenes) {
            const { program, uniforms } = this.programs[scene.shader];
            gl.useProgram(program);
            this.loadSceneUniforms(uniforms, camera, ambientLight, lights);

            for (const node of scene.scene.nodes) {
                this.renderNode(node, scene.shader);
            }
        }
        
    }

    renderMiniMap(screenMatrix) {
        const gl = this.gl;
        const { program, uniforms } = this.programs.overlayDisplay;
        gl.useProgram(program);
        gl.uniformMatrix2fv(uniforms.uScreenMatrix, false, screenMatrix);
        gl.uniform2fv(uniforms.uOffset, this.miniMap.offset);
        gl.bindVertexArray(this.miniMap.vao);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.miniMap.texture);
        gl.uniform1i(uniforms.uTexture, 2);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    renderOverlay(screenMatrix) {
        const gl = this.gl;
        const { program, uniforms } = this.programs.overlayDisplay;
        this.enableBlending();
        gl.uniformMatrix2fv(uniforms.uScreenMatrix, false, screenMatrix);
        gl.uniform2fv(uniforms.uOffset, this.overlay.offset);
        gl.bindVertexArray(this.overlay.vao);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.overlay.texture);
        gl.uniform1i(uniforms.uTexture, 3);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    render(scenes, camera, lights, ambientLight) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        for (const scene of scenes) {
            if(scene.blendEnabled) this.enableBlending();
            else this.disableBlending();
            const { program, uniforms } = this.programs[scene.shader];
            gl.useProgram(program);
            this.loadSceneUniforms(uniforms, camera, ambientLight, lights);

            for (const node of scene.scene.nodes) {
                this.renderNode(node, scene.shader);
            }
        }
    }

    renderNode(node, shader) {
        const gl = this.gl;
        const { program, uniforms } = this.programs[shader];
        if (node.mesh && node.renderable) {
            this.loadNodeUniforms(uniforms, node);

            for (const primitive of node.mesh.primitives) {
                this.renderPrimitive(primitive, shader);
            }
        }
        for (const child of node.children) {
            this.renderNode(child, shader);
        }
    }

    renderPrimitive(primitive, shader) {
        const gl = this.gl;

        const { program, uniforms } = this.programs[shader];

        const vao = this.glObjects.get(primitive);
        gl.bindVertexArray(vao);
        this.loadPrimitiveUniforms(uniforms, primitive);

        if (primitive.indices) {
            const mode = primitive.mode;
            const count = primitive.indices.count;
            const type = primitive.indices.componentType;
            gl.drawElements(mode, count, type, 0);
        } else {
            const mode = primitive.mode;
            const count = primitive.attributes.POSITION.count;
            gl.drawArrays(mode, 0, count);
        }
    }
}
