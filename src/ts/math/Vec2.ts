export default class Vec2 {
	public x: number;
	public y: number;

	constructor(x: number = 0, y: number = 0) {
		this.x = x;
		this.y = y;
	}

	public set(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	public equals(v: Vec2): boolean {
		return this.x === v.x && this.y === v.y;
	}

	public static add(a: Vec2, b: Vec2): Vec2 {
		return new Vec2(a.x + b.x, a.y + b.y);
	}

	public static sub(a: Vec2, b: Vec2): Vec2 {
		return new Vec2(a.x - b.x, a.y - b.y);
	}

	public static addScalar(v: Vec2, s: number): Vec2 {
		return new Vec2(v.x + s, v.y + s);
	}

	public static multiplyScalar(v: Vec2, s: number): Vec2 {
		return new this(v.x * s, v.y * s);
	}

	public static normalize(v: Vec2): Vec2 {
		let dst = new this;
		const length = Math.sqrt(v.x ** 2 + v.y ** 2);

		if (length > 0.00001) {
			dst.x = v.x / length;
			dst.y = v.y / length;
		}

		return dst;
	}

	public static getLength(v: Vec2): number {
		return Math.sqrt(v.x ** 2 + v.y ** 2);
	}

	public static dot(a: Vec2, b: Vec2): number {
		const num = (a.x * b.x) + (a.y * b.y);
		return num <= -1 ? -1 : num >= 1 ? 1 : num;
	}

	public static distance(a: Vec2, b: Vec2): number {
		return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
	}

	public static angleClockwise(a: Vec2, b: Vec2): number {
		const dot = a.x * b.x + a.y * b.y;
		const det = a.x * b.y - a.y * b.x;
		return Math.atan2(det, dot);
	}

	public static copy(v: Vec2): Vec2 {
		return new this(v.x, v.y);
	}

	public static toArray(v: Vec2): [number, number] {
		return [v.x, v.y];
	}
}