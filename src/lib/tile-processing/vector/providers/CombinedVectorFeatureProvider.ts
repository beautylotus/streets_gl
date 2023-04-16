import MapboxVectorFeatureProvider from "~/lib/tile-processing/vector/providers/MapboxVectorFeatureProvider";
import VectorFeatureProvider from "~/lib/tile-processing/vector/providers/VectorFeatureProvider";
import VectorFeatureCollection from "~/lib/tile-processing/vector/features/VectorFeatureCollection";
import OverpassVectorFeatureProvider from "~/lib/tile-processing/vector/providers/OverpassVectorFeatureProvider";
import {Tile3DProviderParams} from "~/lib/tile-processing/tile3d/providers/Tile3DFromVectorProvider";
import MathUtils from "~/lib/math/MathUtils";
import VectorArea from "~/lib/tile-processing/vector/features/VectorArea";

export default class CombinedVectorFeatureProvider extends VectorFeatureProvider {
	private readonly overpassProvider: OverpassVectorFeatureProvider;
	private readonly mapboxProvider: MapboxVectorFeatureProvider;

	public constructor(params: Tile3DProviderParams) {
		super();

		this.overpassProvider = new OverpassVectorFeatureProvider(
			params.overpassEndpoint,
			params.useCached
		);
		this.mapboxProvider = new MapboxVectorFeatureProvider(
			params.mapboxEndpointTemplate,
			params.mapboxAccessToken
		);
	}

	public async getCollection(
		{
			x,
			y,
			zoom
		}: {
			x: number;
			y: number;
			zoom: number;
		}
	): Promise<VectorFeatureCollection> {
		const mapboxRequest = this.mapboxProvider.getCollection({x, y, zoom});
		const overpassRequest = this.overpassProvider.getCollection({x, y, zoom});

		return new Promise((resolve, reject) => {
			Promise.allSettled([mapboxRequest, overpassRequest]).then(([mapboxData, overpassData]) => {
				if (overpassData.status === 'fulfilled' && mapboxData.status === 'fulfilled') {
					const merged = this.mergeCollections(overpassData.value, mapboxData.value);
					this.cleatFeaturesNotInTile(merged, x, y, zoom);
					resolve(merged);
					return;
				}

				if (overpassData.status === 'rejected') {
					reject(overpassData.reason);
					return;
				}

				if (mapboxData.status === 'rejected') {
					reject(mapboxData.reason);
					return;
				}
			});
		});
	}

	private mergeCollections(...collections: VectorFeatureCollection[]): VectorFeatureCollection {
		return {
			nodes: [].concat(...collections.map(c => c.nodes)),
			polylines: [].concat(...collections.map(c => c.polylines)),
			areas: [].concat(...collections.map(c => c.areas))
		};
	}

	private cleatFeaturesNotInTile(features: VectorFeatureCollection, x: number, y: number, zoom: number): void {
		const tileSize = MathUtils.tile2meters(0, 0, 16).x - MathUtils.tile2meters(1, 1, 16).x;

		for (let i = 0; i < features.areas.length; i++) {
			const area = features.areas[i];

			if (area.descriptor.type === 'building' && !this.isAreaInTile(area, tileSize)) {
				features.areas.splice(i, 1);
				i--;
			}
		}
	}

	private isAreaInTile(area: VectorArea, tileSize: number): boolean {
		for (const ring of area.rings) {
			for (const node of ring.nodes) {
				if (node.x >= 0 && node.x <= tileSize && node.y >= 0 && node.y <= tileSize) {
					return true;
				}
			}
		}

		return false;
	}
}