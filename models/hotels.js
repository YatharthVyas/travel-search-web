/* Hotels schema

{
  "name": "Grand Hotel",
  "address": "123 Main Street, New York City, USA",
  "stars": 4,
  "rating": 8.2, // out of 10
  "amenities": [
    "Free Wi-Fi",
    "Swimming pool",
    "Fitness center",
    "Restaurant",
    "Bar",
    "Room service"
  ],
  "price_per_night": 150
}

*/

const mongoose = require("mongoose");

const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
    index: true,
  },
  stars: {
    type: Number,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
  },
  amenities: {
    type: [String],
    required: true,
  },
  price_per_night: {
    type: Number,
    required: true,
    index: true,
  },
});

const Hotel = mongoose.model("Hotel", hotelSchema);

module.exports = Hotel;
