const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const { reviewSchema } = require("../schema.js");
const { isLoggedIn, isReviewAuthor } = require("../middleware.js");
const ReviewController = require("../controller/reviews.js");
const ExpressError = require("../utils/ExpressError.js");

// ✅ Validation middleware
const validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  }
  next();
};

// ✅ Create Review
router.post("/reviews", isLoggedIn, validateReview, wrapAsync(ReviewController.createReview));

// ✅ Delete Review
router.delete("/reviews/:reviewId", isLoggedIn, isReviewAuthor, wrapAsync(ReviewController.deleteReview));

module.exports = router;
