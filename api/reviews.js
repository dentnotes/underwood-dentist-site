// Google reviews for the homepage, via the Places API (New).
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   GOOGLE_PLACES_API_KEY  required. A key with "Places API (New)" enabled.
//   GOOGLE_PLACE_ID        optional. If unset, the clinic is looked up by name and address.
//
// The response is cached on Vercel's CDN for a day, so Google is called roughly
// once a day no matter how many people visit.

const SEARCH_QUERY = "Dentist at Underwood, Unit 1/2960 Logan Road, Underwood QLD 4119";
const FIELDS = "displayName,rating,userRatingCount,googleMapsUri,reviews";

async function findPlaceId(key) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id" },
    body: JSON.stringify({ textQuery: SEARCH_QUERY, languageCode: "en", regionCode: "AU" }),
  });
  if (!res.ok) throw new Error(`Place search failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const id = data.places && data.places[0] && data.places[0].id;
  if (!id) throw new Error("Place search returned no results");
  return id;
}

module.exports = async (req, res) => {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    res.status(503).json({ error: "Reviews are not configured (GOOGLE_PLACES_API_KEY is missing)." });
    return;
  }

  try {
    const placeId = process.env.GOOGLE_PLACE_ID || (await findPlaceId(key));
    const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS },
    });
    if (!r.ok) throw new Error(`Place details failed: ${r.status} ${await r.text()}`);
    const place = await r.json();

    const reviews = (place.reviews || [])
      .filter((rv) => rv.text && rv.text.text)
      .map((rv) => ({
        rating: rv.rating,
        text: rv.text.text,
        time: rv.relativePublishTimeDescription,
        author: rv.authorAttribution && rv.authorAttribution.displayName,
        authorUrl: rv.authorAttribution && rv.authorAttribution.uri,
        authorPhoto: rv.authorAttribution && rv.authorAttribution.photoUri,
        url: rv.googleMapsUri,
      }));

    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json({
      name: place.displayName && place.displayName.text,
      rating: place.rating,
      total: place.userRatingCount,
      url: place.googleMapsUri,
      reviews,
    });
  } catch (err) {
    console.error(err);
    // Cache failures briefly so a Google outage doesn't trigger a call on every visit
    res.setHeader("Cache-Control", "public, s-maxage=300");
    res.status(502).json({ error: "Could not load reviews from Google." });
  }
};
