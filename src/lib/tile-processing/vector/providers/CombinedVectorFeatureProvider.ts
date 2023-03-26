import MapboxVectorFeatureProvider from "~/lib/tile-processing/vector/providers/MapboxVectorFeatureProvider";
import VectorFeatureProvider from "~/lib/tile-processing/vector/providers/VectorFeatureProvider";
import VectorFeatureCollection from "~/lib/tile-processing/vector/features/VectorFeatureCollection";
import OverpassVectorFeatureProvider from "~/lib/tile-processing/vector/providers/OverpassVectorFeatureProvider";

export default class CombinedVectorFeatureProvider extends VectorFeatureProvider {
	private readonly overpassProvider: OverpassVectorFeatureProvider;
	private readonly mapboxProvider: MapboxVectorFeatureProvider;

	public constructor(overpassURL: string) {
		super();

		this.overpassProvider = new OverpassVectorFeatureProvider(overpassURL);
		this.mapboxProvider = new MapboxVectorFeatureProvider();
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

		mapboxRequest.catch(e => console.error(e));
		overpassRequest.catch(e => console.error(e));

		return new Promise((resolve, reject) => {
			Promise.allSettled([mapboxRequest, overpassRequest]).then(([mapboxData, overpassData]) => {
				if (overpassData.status === 'fulfilled' && mapboxData.status === 'fulfilled') {
					const merged = this.mergeCollections(overpassData.value, mapboxData.value);
					resolve(merged);
					return;
				}

				reject();
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
}