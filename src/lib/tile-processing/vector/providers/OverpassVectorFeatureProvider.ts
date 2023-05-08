import MathUtils from "~/lib/math/MathUtils";
import OverpassDataObject, {NodeElement, RelationElement, RelationMember, WayElement} from "./OverpassDataObject";
import VectorFeatureProvider from "~/lib/tile-processing/vector/providers/VectorFeatureProvider";
import VectorFeatureCollection from "~/lib/tile-processing/vector/features/VectorFeatureCollection";
import VectorArea from "~/lib/tile-processing/vector/features/VectorArea";
import Vec2 from "~/lib/math/Vec2";
import OSMNodeHandler from "~/lib/tile-processing/vector/handlers/OSMNodeHandler";
import OSMWayHandler from "~/lib/tile-processing/vector/handlers/OSMWayHandler";
import OSMRelationHandler from "~/lib/tile-processing/vector/handlers/OSMRelationHandler";
import VectorNode from "~/lib/tile-processing/vector/features/VectorNode";
import VectorPolyline from "~/lib/tile-processing/vector/features/VectorPolyline";
import VectorBuildingOutlinesCleaner from "~/lib/tile-processing/vector/VectorBuildingOutlinesCleaner";

const TileRequestMargin = 0.05;

const getRequestBody = (x: number, y: number, zoom: number): string => {
	const position = [
		MathUtils.tile2degrees(x - TileRequestMargin, y + 1 + TileRequestMargin, zoom),
		MathUtils.tile2degrees(x + 1 + TileRequestMargin, y - TileRequestMargin, zoom)
	];
	const bbox = position[0].lat + ',' + position[0].lon + ',' + position[1].lat + ',' + position[1].lon;
	return `
		[out:json][timeout:30];
		(
			node(${bbox});
			way(${bbox});
			rel["type"~"^(multipolygon|building)"](${bbox});
			//rel["type"="building"](br); // this is SLOW
			
			// Make sure that each powerline node knows about all the powerline segments it is connected to
			//way[power=line](${bbox})->.powerline;
			//way(around.powerline:0)[power=line];
		);
		
		out body qt;
		>>;
		out body qt;
	`;
};
const getRelationsRequestBody = (relations: number[]): string => {
	return `
		[out:json][timeout:30];
		(
		  rel(id:${relations.join(',')});
		  >>;
		);
		out body;
	`;
};
const getRelationRequestURL = (relation: number): string => {
	return `https://www.openstreetmap.org/api/0.6/relation/${relation}/relations.json`
};

export default class OverpassVectorFeatureProvider extends VectorFeatureProvider {
	public constructor(
		private readonly overpassURL: string,
		private readonly tileServerEndpoint: string,
		private readonly useCachedTiles: boolean
	) {
		super();
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
		const tileOrigin = MathUtils.tile2meters(x, y + 1, zoom);
		const overpassData = await OverpassVectorFeatureProvider.fetchOverpassTile(
			x, y, zoom,
			this.overpassURL, this.tileServerEndpoint, this.useCachedTiles
		);

		const nodeHandlersMap: Map<number, OSMNodeHandler> = new Map();
		const wayHandlersMap: Map<number, OSMWayHandler> = new Map();
		const relationHandlersMap: Map<number, OSMRelationHandler> = new Map();

		const elements = OverpassVectorFeatureProvider.classifyElements(overpassData.elements);

		for (const element of elements.nodes) {
			const position = Vec2.sub(MathUtils.degrees2meters(element.lat, element.lon), tileOrigin);
			const handler = new OSMNodeHandler(
				element,
				position.x,
				position.y
			);

			nodeHandlersMap.set(element.id, handler);
		}

		for (const element of elements.ways) {
			const nodes = element.nodes.map(nodeId => {
				return nodeHandlersMap.get(nodeId);
			});

			const handler = new OSMWayHandler(
				element,
				nodes
			);

			wayHandlersMap.set(element.id, handler);
		}

		const osmMembersMap: Map<OSMRelationHandler, RelationMember[]> = new Map();

		for (const element of elements.relations) {
			const members = element.members.filter(member => member.type === 'way' || member.type === 'relation');

			if (members.length === 0) {
				continue;
			}

			const handler = new OSMRelationHandler(
				element
			);

			relationHandlersMap.set(element.id, handler);
			osmMembersMap.set(handler, members);
		}

		for (const relation of relationHandlersMap.values()) {
			const members = osmMembersMap.get(relation);

			for (const member of members) {
				const memberId = member.ref;
				let handler: OSMWayHandler | OSMRelationHandler;

				switch (member.type) {
					case 'way':
						handler = wayHandlersMap.get(memberId);
						break;
					case 'relation':
						handler = relationHandlersMap.get(memberId);
						break;
				}

				if (!handler) {
					console.error();
					continue;
				}

				relation.addMember(member, handler);
			}
		}

		const collection = OverpassVectorFeatureProvider.getFeaturesFromHandlers([
			...nodeHandlersMap.values(),
			...wayHandlersMap.values(),
			...relationHandlersMap.values()
		]);

		collection.areas = new VectorBuildingOutlinesCleaner().deleteBuildingOutlines(collection.areas);

		return collection;
	}

	private static getFeaturesFromHandlers(handlers: (OSMNodeHandler | OSMWayHandler | OSMRelationHandler)[]): VectorFeatureCollection {
		const collection: VectorFeatureCollection = {
			nodes: [],
			polylines: [],
			areas: []
		};

		for (const handler of handlers) {
			const output = handler.getFeatures();

			if (output) {
				for (const feature of output) {
					switch (feature.type) {
						case 'node':
							collection.nodes.push(feature as VectorNode);
							break;
						case 'polyline':
							collection.polylines.push(feature as VectorPolyline);
							break;
						case 'area':
							collection.areas.push(feature as VectorArea);
							break;
					}
				}
			}
		}

		return collection;
	}

	private static async fetchOverpassTile(
		x: number,
		y: number,
		zoom: number,
		overpassURL: string,
		tileServerEndpoint: string,
		useCached: boolean
	): Promise<OverpassDataObject> {
		if (useCached) {
			try {
				const tileData = await fetch(`${tileServerEndpoint}/tile/${x}/${y}`, {
					method: 'GET'
				});

				const data = await tileData.json();

				if (!data.error) {
					return data;
				}
			} catch (e) {
				console.error(e);
			}
		}

		const response = await fetch(overpassURL, {
			method: 'POST',
			body: getRequestBody(x, y, zoom)
		});
		return await response.json() as OverpassDataObject;
	}

	// A hacky (but fast) way to get relations that include relations from OverpassDataObject as members.
	// This is much faster than fetching these relations in the main Overpass query.
	private static async repairOverpassRelations(data: OverpassDataObject, overpassURL: string): Promise<OverpassDataObject> {
		const relationIds: Set<number> = new Set();
		const relationRequests: Promise<any>[] = [];

		for (const el of data.elements) {
			if (el.type === 'relation') {
				const url = getRelationRequestURL(el.id);

				relationRequests.push(fetch(url, {
					method: 'GET'
				}).then(r => r.json()));
			}
		}

		if (relationRequests.length === 0) {
			return data;
		}

		const results: OverpassDataObject[] = await Promise.all(relationRequests);

		for (const result of results) {
			if (!result.elements || !result.elements.length) {
				continue;
			}

			const ids = result.elements.filter(el => {
				return el.type === 'relation' && el.tags && (
					el.tags.type === 'multipolygon' || el.tags.type === 'building'
				);
			}).map(el => el.id);

			for (const id of ids) {
				relationIds.add(id);
			}
		}

		if (relationIds.size === 0) {
			return data;
		}

		const requestBody = getRelationsRequestBody(Array.from(relationIds.values()));
		const response = await fetch(overpassURL, {
			method: 'POST',
			body: requestBody
		});
		const patch: OverpassDataObject = await response.json();

		return OverpassVectorFeatureProvider.mergeOverpassDataObjects(data, patch);
	}

	private static mergeOverpassDataObjects(obj0: OverpassDataObject, obj1: OverpassDataObject): OverpassDataObject {
		const nodes: Set<number> = new Set();
		const ways: Set<number> = new Set();
		const relations: Set<number> = new Set();

		for (const el of obj0.elements) {
			switch (el.type) {
				case 'node':
					nodes.add(el.id);
					break;
				case 'way':
					ways.add(el.id);
					break;
				case 'relation':
					relations.add(el.id);
					break;
			}
		}

		for (const el of obj1.elements) {
			let isNewElement: boolean = false;

			switch (el.type) {
				case 'node':
					isNewElement = !nodes.has(el.id);
					break;
				case 'way':
					isNewElement = !ways.has(el.id);
					break;
				case 'relation':
					isNewElement = !relations.has(el.id);
					break;
			}

			if (isNewElement) {
				obj0.elements.push(el);
			}
		}

		return obj0;
	}

	private static classifyElements(elements: (NodeElement | WayElement | RelationElement)[]): {
		nodes: NodeElement[];
		ways: WayElement[];
		relations: RelationElement[];
	} {
		const nodes: NodeElement[] = [];
		const ways: WayElement[] = [];
		const relations: RelationElement[] = [];

		for (const el of elements) {
			switch (el.type) {
				case 'node':
					nodes.push(el);
					break;
				case 'way':
					ways.push(el);
					break;
				case 'relation':
					relations.push(el);
					break;
			}
		}

		return {nodes, ways, relations};
	}
}