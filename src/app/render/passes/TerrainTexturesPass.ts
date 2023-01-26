import Pass from './Pass';
import * as RG from "~/lib/render-graph";
import PassManager from '../PassManager';
import AbstractMaterial from '~/lib/renderer/abstract-renderer/AbstractMaterial';
import TerrainHeightMaterialContainer from "../materials/TerrainHeightMaterialContainer";
import TerrainSystem from "../../systems/TerrainSystem";
import FullScreenQuad from "../../objects/FullScreenQuad";
import AbstractTexture2D from "~/lib/renderer/abstract-renderer/AbstractTexture2D";
import RenderPassResource from "../render-graph/resources/RenderPassResource";
import TerrainNormalMaterialContainer from "../materials/TerrainNormalMaterialContainer";
import TerrainWaterMaterialContainer from "../materials/TerrainWaterMaterialContainer";
import TileSystem from "../../systems/TileSystem";
import TerrainRingHeightMaterialContainer from "../materials/TerrainRingHeightMaterialContainer";
import {UniformFloat1, UniformFloat2, UniformFloat3, UniformInt1} from "~/lib/renderer/abstract-renderer/Uniform";
import TerrainHeightDownscaleMaterialContainer from "../materials/TerrainHeightDownscaleMaterialContainer";
import AbstractTexture2DArray from "~/lib/renderer/abstract-renderer/AbstractTexture2DArray";

function compareTypedArrays(a: TypedArray, b: TypedArray): boolean {
	let i = a.length;

	while (i--) {
		if (a[i] !== b[i]) return false;
	}

	return true;
}

export default class TerrainTexturesPass extends Pass<{
	TerrainHeight: {
		type: RG.InternalResourceType.Local;
		resource: RenderPassResource;
	};
	TerrainNormal: {
		type: RG.InternalResourceType.Output;
		resource: RenderPassResource;
	};
	TerrainWater: {
		type: RG.InternalResourceType.Output;
		resource: RenderPassResource;
	};
	TerrainTileMask: {
		type: RG.InternalResourceType.Output;
		resource: RenderPassResource;
	};
	TerrainRingHeight: {
		type: RG.InternalResourceType.Output;
		resource: RenderPassResource;
	};
}> {
	private quad: FullScreenQuad;
	private heightMaterial: AbstractMaterial;
	private ringHeightMaterial: AbstractMaterial;
	private heightDownscaleMaterial: AbstractMaterial;
	private normalMaterial: AbstractMaterial;
	private waterMaterial: AbstractMaterial;

	public constructor(manager: PassManager) {
		super('TerrainTexturesPass', manager, {
			TerrainHeight: {type: RG.InternalResourceType.Local, resource: manager.getSharedResource('TerrainHeight')},
			TerrainNormal: {type: RG.InternalResourceType.Output, resource: manager.getSharedResource('TerrainNormal')},
			TerrainWater: {type: RG.InternalResourceType.Output, resource: manager.getSharedResource('TerrainWater')},
			TerrainTileMask: {type: RG.InternalResourceType.Output, resource: manager.getSharedResource('TerrainTileMask')},
			TerrainRingHeight: {type: RG.InternalResourceType.Output, resource: manager.getSharedResource('TerrainRingHeight')}
		});

		this.init();
	}

	private init(): void {
		this.heightMaterial = new TerrainHeightMaterialContainer(this.renderer).material;
		this.ringHeightMaterial = new TerrainRingHeightMaterialContainer(this.renderer).material;
		this.heightDownscaleMaterial = new TerrainHeightDownscaleMaterialContainer(this.renderer).material;
		this.normalMaterial = new TerrainNormalMaterialContainer(this.renderer).material;
		this.waterMaterial = new TerrainWaterMaterialContainer(this.renderer).material;
		this.quad = new FullScreenQuad(this.renderer);

		const textureSize = 4 * 512;

		this.getResource('TerrainHeight').descriptor.setSize(textureSize, textureSize, 2);
		this.getResource('TerrainNormal').descriptor.setSize(textureSize, textureSize, 2);
		this.getResource('TerrainWater').descriptor.setSize(2048, 2048, 2);
	}

	public render(): void {
		const camera = this.manager.sceneSystem.objects.camera;
		const terrainSystem = this.manager.systemManager.getSystem(TerrainSystem);
		const tileSystem = this.manager.systemManager.getSystem(TileSystem);
		const terrain = this.manager.sceneSystem.objects.terrain;

		const terrainHeightRenderPass = this.getPhysicalResource('TerrainHeight');
		const terrainNormalRenderPass = this.getPhysicalResource('TerrainNormal');
		const terrainWaterRenderPass = this.getPhysicalResource('TerrainWater');
		const terrainRingHeightRenderPass = this.getPhysicalResource('TerrainRingHeight');

		const heightTex = <AbstractTexture2D>terrainHeightRenderPass.colorAttachments[0].texture;

		const heightLoaders = [terrainSystem.areaLoaders.height0, terrainSystem.areaLoaders.height1];
		const heightLoadersUpdateFlags = [false, false];

		this.heightMaterial.getUniform('tMap').value = null;
		this.renderer.useMaterial(this.heightMaterial);

		for (let layer = 0; layer < heightLoaders.length; layer++) {
			const heightLoader = heightLoaders[layer];
			const dirtyTiles = heightLoader.getDirtyTileStates();

			terrainHeightRenderPass.colorAttachments[0].level = 0;
			terrainHeightRenderPass.colorAttachments[0].slice = layer;
			this.renderer.beginRenderPass(terrainHeightRenderPass);

			if (dirtyTiles.length > 0) {
				heightLoadersUpdateFlags[layer] = true;
			}

			for (const tileState of dirtyTiles) {
				const x = tileState.localX;
				const y = tileState.localY;
				const count = heightLoader.viewportSize;

				const scale = 1 / count;
				const transform = [x * scale, (count - y - 1) * scale, scale];

				this.heightMaterial.getUniform('tMap').value = tileState.tile.getTexture(this.renderer);
				this.heightMaterial.getUniform('transform', 'MainBlock').value = new Float32Array(transform);
				this.heightMaterial.updateUniformBlock('MainBlock');
				this.heightMaterial.updateUniform('tMap');

				this.quad.mesh.draw();
			}
		}

		this.renderer.useMaterial(this.heightDownscaleMaterial);

		for (let layer = 0; layer < 2; layer++) {
			if (!heightLoadersUpdateFlags[layer]) {
				continue;
			}

			this.heightDownscaleMaterial.getUniform<UniformInt1>('layer', 'MainBlock').value[0] = layer;
			this.heightDownscaleMaterial.updateUniformBlock('MainBlock');

			for (let i = 0; i < 5; i++) {
				terrainHeightRenderPass.colorAttachments[0].level = i + 1;
				terrainHeightRenderPass.colorAttachments[0].slice = layer;
				this.renderer.beginRenderPass(terrainHeightRenderPass);

				heightTex.baseLevel = i;
				heightTex.maxLevel = i;
				heightTex.updateBaseAndMaxLevel();

				this.heightDownscaleMaterial.getUniform('tMap').value = heightTex;
				this.heightDownscaleMaterial.updateUniform('tMap');

				this.manager.renderSystem.fullScreenTriangle.mesh.draw();
			}
		}

		heightTex.baseLevel = 0;
		heightTex.maxLevel = 10000;
		heightTex.updateBaseAndMaxLevel();

		this.renderer.useMaterial(this.normalMaterial);

		for (let layer = 0; layer < 2; layer++) {
			if (!heightLoadersUpdateFlags[layer]) {
				continue;
			}

			terrainNormalRenderPass.colorAttachments[0].slice = layer;
			this.renderer.beginRenderPass(terrainNormalRenderPass);

			this.normalMaterial.getUniform('tHeight').value = <AbstractTexture2DArray>terrainHeightRenderPass.colorAttachments[0].texture;
			this.normalMaterial.getUniform<UniformInt1>('layer', 'MainBlock').value[0] = layer;
			this.normalMaterial.getUniform<UniformFloat1>('heightMapWorldSize', 'MainBlock').value[0] = heightLoaders[layer].getSizeInMeters();
			this.normalMaterial.updateUniform('tHeight');
			this.normalMaterial.updateUniformBlock('MainBlock');

			this.quad.mesh.draw();
		}

		this.ringHeightMaterial.getUniform('tHeight').value = heightTex;
		this.renderer.useMaterial(this.ringHeightMaterial);

		for (let i = 0; i < terrain.children.length; i++) {
			const ring = terrain.children[i];

			terrainRingHeightRenderPass.colorAttachments[0].slice = i;
			this.renderer.beginRenderPass(terrainRingHeightRenderPass);

			const heightLayer = i < 2 ? 0 : 1;
			const heightLevel = heightLayer === 0 ? (i + 2) : (i - 1);
			const transform = heightLayer === 0 ? ring.heightTextureTransform0 : ring.heightTextureTransform1;

			this.ringHeightMaterial.getUniform<UniformFloat3>('transformHeight', 'PerMesh').value = transform;
			this.ringHeightMaterial.getUniform<UniformFloat2>('morphOffset', 'PerMesh').value = ring.morphOffset;
			this.ringHeightMaterial.getUniform<UniformFloat1>('size', 'PerMesh').value[0] = ring.size;
			this.ringHeightMaterial.getUniform<UniformFloat1>('segmentCount', 'PerMesh').value[0] = ring.segmentCount * 2;
			this.ringHeightMaterial.getUniform<UniformFloat1>('isLastRing', 'PerMesh').value[0] = +ring.isLastRing;
			this.ringHeightMaterial.getUniform('cameraPosition', 'PerMesh').value = new Float32Array([camera.position.x - ring.position.x, camera.position.z - ring.position.z]);
			this.ringHeightMaterial.getUniform<UniformInt1>('levelId', 'PerMesh').value[0] = heightLevel;
			this.ringHeightMaterial.getUniform<UniformInt1>('layerId', 'PerMesh').value[0] = heightLayer;
			this.ringHeightMaterial.updateUniformBlock('PerMesh');

			this.quad.mesh.draw();
		}

		const waterLoaders = [
			terrainSystem.areaLoaders.water0,
			terrainSystem.areaLoaders.water1
		];
		let waterMaterialInUse = false;

		for (let i = 0; i < waterLoaders.length; i++) {
			const waterLoader = waterLoaders[i];
			const dirtyTiles = waterLoader.getDirtyTileStates();

			if (dirtyTiles.length === 0) {
				continue;
			}

			if (!waterMaterialInUse) {
				this.renderer.useMaterial(this.waterMaterial);
				waterMaterialInUse = true;
			}

			terrainWaterRenderPass.colorAttachments[0].slice = i;
			this.renderer.beginRenderPass(terrainWaterRenderPass);

			for (const tileState of dirtyTiles) {
				const x = tileState.localX;
				const y = tileState.localY;
				const count = waterLoader.viewportSize;

				const scale = 1 / count;
				const transform = [x * scale, (count - y - 1) * scale, scale];

				this.waterMaterial.getUniform('transform', 'MainBlock').value = new Float32Array(transform);
				this.waterMaterial.getUniform('fillValue', 'MainBlock').value = new Float32Array([0]);
				this.waterMaterial.updateUniformBlock('MainBlock');

				this.quad.mesh.draw();

				this.waterMaterial.getUniform('fillValue', 'MainBlock').value = new Float32Array([1]);
				this.waterMaterial.updateUniformBlock('MainBlock');

				const mesh = tileState.tile.getMesh(this.renderer);

				mesh.draw();
			}
		}

		this.updateTileMask(terrainSystem, tileSystem);
	}

	private updateTileMask(terrainSystem: TerrainSystem, tileSystem: TileSystem): void {
		const tileMaskTexture = <AbstractTexture2D>this.getPhysicalResource('TerrainTileMask').colorAttachments[0].texture;
		const buffer = new Uint8Array(tileMaskTexture.width * tileMaskTexture.height);
		const start = terrainSystem.maskOriginTiles;

		for (let x = 0; x < tileMaskTexture.width; x++) {
			for (let y = 0; y < tileMaskTexture.height; y++) {
				const tile = tileSystem.getTile(x + start.x, y + start.y);

				if (tile) {
					buffer[x + y * tileMaskTexture.width] = tile.roads ? 255 : 0;
				}
			}
		}

		if (tileMaskTexture.data === null || !compareTypedArrays(tileMaskTexture.data as Uint8Array, buffer)) {
			tileMaskTexture.data = buffer;
			tileMaskTexture.updateFromData();
		}
	}

	public setSize(width: number, height: number): void {

	}
}