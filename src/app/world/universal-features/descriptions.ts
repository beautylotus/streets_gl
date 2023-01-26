export interface UniversalNodeDescription {
	name?: string;
	type?: 'tree' | 'hydrant' | 'transmissionTower' | 'utilityPole' | 'artwork';
	direction?: number;
}

export interface UniversalPolylineDescription {
	name?: string;
	type: 'path' | 'fence' | 'hedge' | 'powerLine' | 'treeRow';
	pathType?: 'roadway' | 'footway' | 'cycleway' | 'railway';
	width?: number;
	height?: number;
	embeddedFootway?: boolean;
	embeddedFootwayWidth?: boolean;
	lanesForward?: number;
	lanesBackward?: number;
}

export interface UniversalAreaDescription {
	name?: string;
	type: 'building' | 'forest' | 'roadway' | 'footway' | 'water' | 'farmland' | 'sand' | 'rock';
	buildingLevels?: number;
	buildingHeight?: number;
	buildingMinHeight?: number;
	buildingRoofHeight?: number;
	buildingRoofType?: 'flat' | 'hipped' | 'gabled' | 'pyramidal';
	buildingFacadeMaterial?: 'plaster' | 'brick' | 'wood' | 'glass' | 'cementBlock';
	buildingFacadeColor?: number;
	buildingRoofMaterial?: 'default' | 'tiles' | 'metal' | 'concrete';
	buildingRoofColor?: number;
	buildingWindows?: boolean;
}