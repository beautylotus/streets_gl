import RenderableObject3D from "./RenderableObject3D";
import AbstractMesh from "~/lib/renderer/abstract-renderer/AbstractMesh";
import AbstractRenderer from "~/lib/renderer/abstract-renderer/AbstractRenderer";
import {RendererTypes} from "~/lib/renderer/RendererTypes";
import AbstractAttributeBuffer from "~/lib/renderer/abstract-renderer/AbstractAttributeBuffer";

export interface InstanceBuffers {
	position: Float32Array;
	normal: Float32Array;
	uv: Float32Array;
	indices: Uint32Array;
}

export default class InstancedTree extends RenderableObject3D {
	private static readonly FloatsPerInstance: number = 6;
	public mesh: AbstractMesh = null;
	private interleavedAttributeBuffer: AbstractAttributeBuffer = null;
	private instanceBuffers: InstanceBuffers;
	private interleavedBuffer: Float32Array = new Float32Array(1);
	private instanceCount: number = 0;

	public constructor(instanceBuffers: InstanceBuffers) {
		super();

		this.instanceBuffers = instanceBuffers;
	}

	public setInstancesInterleavedBuffer(interleavedBuffer: Float32Array): void {
		this.interleavedBuffer = interleavedBuffer;
		this.instanceCount = interleavedBuffer.length / InstancedTree.FloatsPerInstance;

		if (this.mesh && this.interleavedAttributeBuffer) {
			this.interleavedAttributeBuffer.setData(this.interleavedBuffer);
			this.mesh.instanceCount = this.instanceCount;
		}
	}

	public isMeshReady(): boolean {
		return this.mesh !== null;
	}

	public updateMesh(renderer: AbstractRenderer): void {
		if (!this.mesh) {
			this.interleavedAttributeBuffer = renderer.createAttributeBuffer({
				data: this.interleavedBuffer,
				usage: RendererTypes.BufferUsage.DynamicDraw
			});

			this.mesh = renderer.createMesh({
				indexed: true,
				indices: this.instanceBuffers.indices,
				instanceCount: this.instanceCount,
				instanced: true,
				attributes: [
					renderer.createAttribute({
						name: 'position',
						size: 3,
						type: RendererTypes.AttributeType.Float32,
						format: RendererTypes.AttributeFormat.Float,
						normalized: false,
						buffer: renderer.createAttributeBuffer({
							data: this.instanceBuffers.position,
						})
					}),
					renderer.createAttribute({
						name: 'normal',
						size: 3,
						type:  RendererTypes.AttributeType.Float32,
						format: RendererTypes.AttributeFormat.Float,
						normalized: false,
						buffer: renderer.createAttributeBuffer({
							data: this.instanceBuffers.normal,
						})
					}),
					renderer.createAttribute({
						name: 'uv',
						size: 2,
						type:  RendererTypes.AttributeType.Float32,
						format: RendererTypes.AttributeFormat.Float,
						normalized: false,
						buffer: renderer.createAttributeBuffer({
							data: this.instanceBuffers.uv,
						})
					}),
					renderer.createAttribute({
						name: 'instancePosition',
						size: 3,
						type: RendererTypes.AttributeType.Float32,
						format: RendererTypes.AttributeFormat.Float,
						normalized: false,
						instanced: true,
						stride: 6 * 4,
						offset: 0,
						buffer: this.interleavedAttributeBuffer
					}),
					renderer.createAttribute({
						name: 'instanceScale',
						size: 1,
						type: RendererTypes.AttributeType.Float32,
						format: RendererTypes.AttributeFormat.Float,
						normalized: false,
						instanced: true,
						stride: 6 * 4,
						offset: 3 * 4,
						buffer: this.interleavedAttributeBuffer
					}),
					renderer.createAttribute({
						name: 'instanceRotation',
						size: 1,
						type: RendererTypes.AttributeType.Float32,
						format: RendererTypes.AttributeFormat.Float,
						normalized: false,
						instanced: true,
						stride: 6 * 4,
						offset: 4 * 4,
						buffer: this.interleavedAttributeBuffer
					}),
					renderer.createAttribute({
						name: 'instanceSeed',
						size: 1,
						type: RendererTypes.AttributeType.Float32,
						format: RendererTypes.AttributeFormat.Float,
						normalized: false,
						instanced: true,
						stride: 6 * 4,
						offset: 5 * 4,
						buffer: this.interleavedAttributeBuffer
					})
				]
			});
		}
	}
}