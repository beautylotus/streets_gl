export interface VectorNodeDescriptor {
	type?: 'tree' | 'rock' | 'hydrant' | 'transmissionTower' | 'utilityPole' | 'artwork' | 'adColumn' | 'windTurbine';
	direction?: number;
	height?: number;
}

export interface VectorPolylineDescriptor {
	type: 'path' | 'fence' | 'hedge' | 'powerLine';
	pathType?: 'roadway' | 'footway' | 'cycleway' | 'railway' | 'tramway' | 'runway';
	pathMaterial?: 'asphalt' | 'concrete' | 'dirt' | 'sand' | 'gravel' | 'cobblestone' | 'wood';
	width?: number;
	height?: number;
	minHeight?: number;
	lanesForward?: number;
	lanesBackward?: number;
	side?: 'both' | 'left' | 'right';
}

export interface VectorAreaDescriptor {
	label?: string;
	type: 'building' | 'buildingPart' | 'asphalt' | 'roadwayIntersection' | 'pavement' | 'water' | 'farmland' |
		'grass' | 'sand' | 'rock' | 'pitch' | 'manicuredGrass' | 'helipad' | 'forest' | 'garden' | 'construction' |
		'buildingConstruction';
	intersectionMaterial?: 'asphalt' | 'concrete' | 'cobblestone';
	pitchType?: 'football' | 'basketball' | 'tennis';
	buildingLevels?: number;
	buildingHeight?: number;
	buildingMinHeight?: number;
	buildingRoofHeight?: number;
	buildingRoofType?: 'flat' | 'hipped' | 'gabled' | 'pyramidal' | 'onion' | 'dome' | 'round' | 'skillion' |
		'mansard' | 'quadrupleSaltbox';
	buildingRoofOrientation?: 'along' | 'across';
	buildingRoofDirection?: number;
	buildingRoofAngle?: number;
	buildingFacadeMaterial?: 'plaster' | 'brick' | 'wood' | 'glass' | 'mirror' | 'cementBlock';
	buildingFacadeColor?: number;
	buildingRoofMaterial?: 'default' | 'tiles' | 'metal' | 'concrete' | 'thatch' | 'eternit' | 'grass' | 'glass' |
		'tar';
	buildingRoofColor?: number;
	buildingWindows?: boolean;
}