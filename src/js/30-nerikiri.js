const SWEET_RADIUS = 0.024;
const SWEET_HEIGHT = 0.034;
const SWEET_CUT = 0.0055;

// Build a sweet between two parallel cuts. The end discs have their own
// normals and material so a newly exposed face reads as the filling.
function nerikiriGeometry(left, right) {
  const points = [], indices = [];
  const rings = 16, sides = 32;
  const from = Math.acos(-left / SWEET_RADIUS);
  const to = Math.acos(-right / SWEET_RADIUS);
  function point(x, radius, angle) {
    points.push(x, SWEET_HEIGHT / 2 * (1 + radius * Math.cos(angle)), SWEET_RADIUS * radius * Math.sin(angle));
  }
  for (let ring = 0; ring <= rings; ring++) {
    const a = from + (to - from) * ring / rings;
    for (let side = 0; side < sides; side++) point(-SWEET_RADIUS * Math.cos(a), Math.sin(a), side / sides * Math.PI * 2);
  }
  for (let ring = 0; ring < rings; ring++) {
    for (let side = 0; side < sides; side++) {
      const a = ring * sides + side, b = ring * sides + (side + 1) % sides;
      indices.push(a, b, a + sides, b, b + sides, a + sides);
    }
  }
  const shellCount = indices.length;
  for (const [x, normal] of [[left, -1], [right, 1]]) {
    if (Math.abs(x) >= SWEET_RADIUS) continue;
    const center = points.length / 3;
    points.push(x, SWEET_HEIGHT / 2, 0);
    const radius = Math.sqrt(1 - (x / SWEET_RADIUS) ** 2);
    for (let side = 0; side < sides; side++) point(x, radius, side / sides * Math.PI * 2);
    for (let side = 0; side < sides; side++) {
      const a = center + 1 + side, b = center + 1 + (side + 1) % sides;
      indices.push(center, normal < 0 ? b : a, normal < 0 ? a : b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Match shading across slice boundaries before the separated faces are shown.
  const normals = geometry.attributes.normal;
  for (let i = 0; i < (rings + 1) * sides; i++) {
    const x = points[i * 3] / SWEET_RADIUS ** 2;
    const y = (points[i * 3 + 1] - SWEET_HEIGHT / 2) / (SWEET_HEIGHT / 2) ** 2;
    const z = points[i * 3 + 2] / SWEET_RADIUS ** 2;
    const length = Math.hypot(x, y, z);
    normals.setXYZ(i, x / length, y / length, z / length);
  }
  geometry.addGroup(0, shellCount, 0);
  geometry.addGroup(shellCount, indices.length - shellCount, 1);
  return geometry;
}
