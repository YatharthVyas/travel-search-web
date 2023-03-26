/* Flights Schema:

{
  "from": "JFK",
  "to": "LAX",
  "stops": ["ORD"],
  "price": 400,
  "departure_time": "08:00",
  "arrival_time": "13:00"
}

*/

const mongoose = require("mongoose");

const flightSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
    index: true,
  },
  to: {
    type: String,
    required: true,
    index: true,
  },
  stops: {
    type: [String],
    required: true,
  },
  price: {
    type: Number,
    required: true,
    index: true,
  },
  departure_time: {
    type: String,
    required: true,
  },
  arrival_time: {
    type: String,
    required: true,
  },
});

const Flight = mongoose.model("Flight", flightSchema);

module.exports = Flight;
