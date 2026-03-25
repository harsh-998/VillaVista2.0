mapboxgl.accessToken = mapToken;

// ✅ Safety check to prevent runtime errors
if (
  !listing.geometry ||
  !listing.geometry.coordinates ||
  listing.geometry.coordinates.length !== 2 ||
  isNaN(listing.geometry.coordinates[0]) ||
  isNaN(listing.geometry.coordinates[1])
) {
  console.warn("⚠️ Invalid or missing geometry, using fallback coordinates.");

  // ✅ Default: Center map in India (New Delhi)
  listing.geometry = {
    type: "Point",
    coordinates: [77.209, 28.6139],
  };
}

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: listing.geometry.coordinates, // [lng, lat]
  zoom: 9,
});

// ✅ Add zoom & rotation controls
map.addControl(new mapboxgl.NavigationControl());

// ✅ Marker setup (clean color, popup text)
new mapboxgl.Marker({ color: "red" })
  .setLngLat(listing.geometry.coordinates)
  .setPopup(
    new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <h4>${listing.title}</h4>
      <p>${listing.location}, ${listing.country}</p>
      <p><em>Exact location will be shared after booking.</em></p>
    `)
  )
  .addTo(map);
