export function trackBounds(track) {
  const points = track.paths.concat(track.polygons ?? []).flat();
  const xs = points.map(point => point[0]);
  const ys = points.map(point => point[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function fitTrack(bounds, width, height) {
  const paddingMM = 170;
  return Math.min(width / (bounds.width + paddingMM), height / (bounds.height + paddingMM));
}
