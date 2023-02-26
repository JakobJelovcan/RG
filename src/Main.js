import { Application } from '../common/engine/Application.js'
import { GLTFLoader } from './GLTFLoader.js'
import { Renderer } from './Renderer.js'
import { VehicleController } from './VehicleController.js'
import { vec2, quat, mat2 } from '../lib/gl-matrix-module.js';
import { Physics } from './Physics.js';

class App extends Application {
    async start() {
        this.loader = new GLTFLoader();
        await this.loader.load('../models/Scene.gltf');
        await this.loader.loadOBB('../models/OBB.json');
        await this.loadScenes();
        await this.loadCameras();
        await this.loadLights();
        await this.loadCar();
        await this.loadChests();

        this.time = performance.now();
        this.startTime = this.time;

        this.chestTimeFound = 0;
        this.overlayActive = false;
        
        this.windMillBlades = await this.loader.loadNode('Windmill_Blades');
        this.sky = await this.loader.loadNode('Sky');
        
        this.ambientLight = [0.1, 0.1, 0.1];
        this.screenMatrix = mat2.create();
        
        if(!this.scenes || !this.cameras.mainCamera) {
            throw new Error("Scene or camera not present in glTF");
        }
        if(!this.cameras.mainCamera.camera) {
            throw new Error("Camera node does not contain a camera reference");
        }

        this.physics = new Physics([this.cityScene, this.boundingScene, this.groundScene]);
        this.skyPhysics = new Physics([this.boundingScene]);
        this.chestPhysics = new Physics([this.treasureScene]);
        
        this.renderer = new Renderer(this.gl);
        this.prepareScenes();
        await this.renderer.prepareOverlay();
        this.resize();
    }

    async loadChests() {
        this.chests = 
        [
            await this.loader.loadNode('Chest'),
            await this.loader.loadNode('Chest.001'),
            await this.loader.loadNode('Chest.002'),
            await this.loader.loadNode('Chest.003'),
        ];
        const selected = Math.round(Math.random() * 4);
        for(let i = 0; i < 4; ++i) {
            if(i != selected) {
                this.chests[i].renderable = false;
                this.chests[i].colidable = false;
            }
        }
        this.activeChest = this.chests[selected];
    }
    
    async loadCameras() {
        this.cameras =
        {
            mainCamera: await this.loader.loadNode('Car_Camera.001'),
            miniMapCamera: await this.loader.loadNode('MiniMap_Camera'),
        };
    }

    async loadLights() {
        this.lights = 
        {
            moon: await this.loader.loadNode('Moon'),
            moon1: await this.loader.loadNode('Moon1'),
            leftHeadlight: await this.loader.loadNode('LeftHeadlight'),
            rightHeadlight: await this.loader.loadNode('RightHeadlight'),
        };
    }

    async loadCar() {
        this.car = await this.loader.loadNode('Car');
        this.carWheels = 
        {
            frontLeftWheel: await this.loader.loadNode('Car_FrontLeftWheel'),
            frontRightWheel: await this.loader.loadNode('Car_FrontRightWheel'),
            backLeftWheel: await this.loader.loadNode('Car_BackLeftWheel'),
            backRightWheel: await this.loader.loadNode('Car_BackRightWheel'),
        }
        this.controller = new VehicleController(this.car, this.carWheels, this.cameras.mainCamera, this.canvas);
    }

    async loadScenes() {
        this.cityScene = await this.loader.loadScene('CityScene');
        this.groundScene = await this.loader.loadScene('GroundScene');
        this.backdropScene = await this.loader.loadScene('BackdropScene');
        this.boundingScene = await this.loader.loadScene('BoundsScene');
        this.skyScene = await this.loader.loadScene('SkyScene');
        this.treasureScene = await this.loader.loadScene('TreasureScene');
        this.scenes = 
        [
            { scene: this.cityScene, shader: 'base', blendEnabled: false },
            { scene: this.treasureScene, shader: 'base', blendEnabled: false},
            { scene: this.groundScene, shader: 'normal', blendEnabled: false },
            { scene: this.backdropScene, shader: 'backdrop', blendEnabled: false },
            { scene: this.skyScene, shader: 'sky', blendEnabled: true }
        ];
        this.miniMapScenes = 
        [
            { scene: this.cityScene, shader: 'base', blendEnabled: false },
            { scene: this.groundScene, shader: 'normal', blendEnabled: false },
        ];
    }

    prepareSky() {
        for(const node of this.skyScene.nodes) {
            if(node.animated) node.setRandomVelocity();
        }
    }

    updateSky(dt) {
        for(const node of this.skyScene.nodes) this.skyPhysics.moveNode(node, dt);
    }

    prepareScenes() {
        for(const scene of this.scenes) this.renderer.prepareScene(scene.scene);
        this.renderer.prepareMiniMap();
        this.prepareSky();
    }

    resolveColisions(dt) {
        this.physics.resolveSceneColisions(this.car, dt);
        this.physics.resolveSceneColisions(this.cameras.mainCamera, dt);
    }

    checkChestHit(dt) {
        if(this.chestPhysics.resolveSceneColisions(this.car, dt)) {
            this.activeChest.renderable = false;
            this.activeChest.colidable = false;
            this.chestTimeFound = performance.now();
            this.overlayActive = true;
        }
    }
    
    render() {
        if(this.renderer) {
            this.renderer.renderMiniMapTexture(this.miniMapScenes, this.cameras.miniMapCamera, this.ambientLight, this.lights);
            this.renderer.render(this.scenes, this.cameras.mainCamera, this.lights, this.ambientLight);
            this.renderer.renderMiniMap(this.screenMatrix);
            if(this.overlayActive) this.renderer.renderOverlay(this.screenMatrix);
        }
    }
    
    update(){
        this.time = performance.now();
        const dt = Math.min((this.time - this.startTime) * 0.001, 0.02);
        this.startTime = this.time;
        this.controller.update(dt);
        
        const windmillRotation = this.windMillBlades.rotation;
        quat.rotateZ(windmillRotation, windmillRotation, dt);
        this.windMillBlades.rotation = windmillRotation;
        
        const skyRotation = this.sky.rotation;
        quat.rotateY(skyRotation, skyRotation, dt * -0.004);
        this.sky.rotation = skyRotation;
        this.resolveColisions(dt);
        this.checkChestHit(dt);
        this.updateSky(dt);

        if(this.overlayActive) {
            if(performance.now() - this.chestTimeFound > 3000) this.overlayActive = false;
        }
    }

    resize(){
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const aspectRatio = w / h;
        this.screenMatrix = mat2.fromScaling(this.screenMatrix, vec2.fromValues(1 / aspectRatio, 1));
        if(this.cameras.mainCamera) {
            this.cameras.mainCamera.camera.aspect = aspectRatio;
            this.cameras.mainCamera.camera.updateMatrix();
        }
    }
}

const canvas = document.querySelector('canvas');
const app = new App(canvas);
await app.init();