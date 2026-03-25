const listings = require("../models/listing");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
require("dotenv").config();

const mapToken = process.env.MAPBOX_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

// ✅ Show all listings
module.exports.index = async (req, res) => {
  const allListing = await listings.find({});
  res.render("listings/index.ejs", { allListing });
};

// ✅ Render new listing form
module.exports.rendernewForm = async (req, res) => {
  res.render("listings/form.ejs");
};

// ✅ Show single listing
module.exports.showsallListings = async (req, res) => {
  const { id } = req.params;
  const listing = await listings
    .findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");

  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }

  res.render("listings/show.ejs", { listing });
};

// ✅ Render edit form
module.exports.rendereditForm = async (req, res) => {
  const { id } = req.params;
  const listing = await listings.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_150,h_100");

  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

// ✅ Update listing
module.exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const listing = await listings.findByIdAndUpdate(id, { ...req.body.listing });

  if (req.file) {
    listing.image = { url: req.file.path, filename: req.file.filename };
    await listing.save();
  }

  req.flash("success", "Listing updated successfully!");
  res.redirect(`/listings/${id}`);
};

// ✅ Delete listing
module.exports.destroyListing = async (req, res) => {
  const { id } = req.params;
  await listings.findByIdAndDelete(id);
  req.flash("success", "Listing deleted successfully!");
  res.redirect("/listings");
};

// ✅ Create new listing with proper geometry (final version)
module.exports.createListing = async (req, res, next) => {
  try {
    // 🔹 Forward geocode user-entered location via Mapbox
    const response = await geocodingClient
      .forwardGeocode({
        query: req.body.listing.location,
        limit: 1,
      })
      .send();

    // 🔹 Use returned coordinates if valid, otherwise fallback
    const geometry =
      response.body.features.length > 0
        ? response.body.features[0].geometry
        : { type: "Point", coordinates: [77.209, 28.6139] }; // Default = New Delhi

    // 🔹 Create new listing
    const listing = new listings(req.body.listing);
    listing.owner = req.user._id;
    listing.geometry = geometry;

    // 🔹 Image handling (with fallback)
    if (req.file) {
      listing.image = { url: req.file.path, filename: req.file.filename };
    } else {
      listing.image = {
        url: "/default.jpg",
        filename: "default",
      };
    }

    // 🔹 Save listing
    await listing.save();
    console.log("✅ Saved listing with geometry:", listing.geometry);

    req.flash("success", "New listing created successfully!");
    res.redirect(`/listings/${listing._id}`);
  } catch (err) {
    console.error("❌ Error creating listing:", err);
    req.flash("error", "Failed to create listing. Please try again.");
    res.redirect("/listings/new");
  }
};
