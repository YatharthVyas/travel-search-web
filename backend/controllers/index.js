const Flights = require("../models/flights");
const Hotels = require("../models/hotels");

const { CITIES, CITIES_MAP, HOTEL_AMENITIES } = require("../constants");
/*
 * GET /flights
 * Returns a list of flights from the given origin to the given destination on the given date
 * Query Parameters:
 * - from: the origin airport
 * - to: the destination airport
 * Returns:
 * - status: 200 on success
 * - content: list of flights matching the query parameters
 * - status: 400 if from, to, or date are not provided
 * - status: 500 if there is an error in the database
 */
exports.getFlights = async (from, to) => {
  try {
    const flights = await Flights.find({
      $or: [
        { $and: [{ from }, { to }] },
        { $and: [{ from: to }, { to: from }] },
      ],
    }).sort({ price: 1 });

    return flights;
  } catch (err) {
    console.error(err);
    return [];
  }
};

// Get Hotel and Flights:
/*
 * First we get the flights from the origin to the destination
 * Then we get the hotels in the destination city sorted by price
 * Then we take the minimum price of both flights and subtract it
 * from our budget. We then filter out all hotels that are less
 * than the remaining budget. We then return the list of hotels
 *
 * Query Parameters:
 * - from: the origin airport
 * - to: the destination airport
 * - budget: the budget for the trip
 * Returns:
 * - status: 200 on success
 * - content: list of hotels and flights matching the query parameters
 */
exports.getHotelAndFlights = async (req) => {
  const { from, to, budget, days, sortBy } = req.query;

  const flights = await this.getFlights(from, to);
  if (flights.length == 0) {
    return { data: {}, error: "Please increase your budget" };
  }

  try {
    // filtering can be done client-side to further improve performance
    const sourceFlights = flights.filter((flight) => flight.from == from);
    const destinationFlights = flights.filter((flight) => flight.from == to);

    // get remaining budget after subtracting flight price
    const remainingBudget =
      (budget - sourceFlights[0].price - destinationFlights[0].price) / days;

    // get hotels in destination city sorted by price
    const hotels = await Hotels.find({
      address: { $regex: CITIES_MAP[to], $options: "i" },
      price_per_night: { $lte: remainingBudget },
    }).sort({ ratings: -1, stars: -1, price_per_night: 1 });

    if (hotels.length == 0) {
      return { data: {}, error: "Please increase your budget" };
    }

    const trips = [];

    // generate all possible trips using the flights and hotels
    sourceFlights.forEach((sourceFlight) => {
      destinationFlights.forEach((destinationFlight) => {
        hotels.forEach((hotel) => {
          const trip = {
            sourceFlight,
            destinationFlight,
            hotel,
            totalCost:
              sourceFlight.price +
              destinationFlight.price +
              hotel.price_per_night * days,
          };
          if (trip.totalCost <= budget) trips.push(trip);
        });
      });
    });

    // sort trips
    // can be done client-side to further improve performance
    if (sortBy === "rating") {
      trips.sort(
        (a, b) =>
          b.hotel.rating - a.hotel.rating ||
          b.hotel.stars - a.hotel.stars ||
          b.hotel.price_per_night - a.hotel.price_per_night
      );
    } else if (sortBy === "stars") {
      trips.sort(
        (a, b) =>
          b.hotel.stars - a.hotel.stars ||
          b.hotel.rating - a.hotel.rating ||
          b.hotel.price_per_night - a.hotel.price_per_night
      );
    } else {
      trips.sort((a, b) => a.totalCost - b.totalCost);
    }

    return { data: { trips } };
  } catch (err) {
    console.error(err);
    return { data: {}, error: "Error in fetching hotels and flights" };
  }
};

// Generate 100 random Flights Data
exports.generateFlightsData = async (req, res) => {
  // Delete all existing flights data
  await Flights.deleteMany({});

  // Generate 100 random flights data
  const flights = [];

  CITIES.forEach((fromCity) => {
    CITIES.forEach((toCity) => {
      // assume that each flight runs every day and completes it's trip on the same day
      if (toCity != fromCity) {
        for (let i = 0; i < 5; i++) {
          // generate random departure and arrival times
          const departure_time = {
            hour: Math.floor(Math.random() * 18),
            minute: Math.floor(Math.random() * 60),
          };

          // arrival time should be at least 1 hour after departure time
          const arrival_time = {
            hour:
              departure_time.hour +
              1 +
              Math.floor(Math.random() * (23 - departure_time.hour)),
            minute: departure_time.minute + Math.floor(Math.random() * 60),
          };

          // generate random stops
          const stops = [];
          const filteredCities = CITIES.filter(
            (city) => city != fromCity && city != toCity
          );
          const numStops = Math.floor(Math.random() * filteredCities.length);
          for (let i = 0; i < numStops; i++) {
            const randomCity =
              filteredCities[Math.floor(Math.random() * filteredCities.length)];
            stops.push(randomCity);
          }

          // generate flight document for mongoDB
          const flight = {
            from: fromCity,
            to: toCity,
            stops,
            price: 200 + Math.floor(Math.random() * 1300), // random price between $200 and $1500
            departure_time:
              String(departure_time.hour) + ":" + String(departure_time.minute),
            arrival_time:
              String(arrival_time.hour) + ":" + String(arrival_time.minute),
          };

          flights.push(flight);
        }
      }
    });
  });

  try {
    // insert all flights into the database together (faster than inserting one by one)
    await Flights.insertMany(flights);

    // Note: if we had to write the above data into a json file (as asked in the task), we can use the below code:
    const fs = require("fs");
    const data = JSON.stringify(flights);
    fs.writeFileSync("flights.json", data, (err) => {
      if (err) throw err;
      console.log("The file has been saved!");
    });

    return res.status(200).send("Flights Data Generated");
  } catch (err) {
    console.error(err);
    return res.status(400).send("Error in generating flights data");
  }
};

// Generate 25 random Hotels Data
exports.generateHotelsData = async (req, res) => {
  // Delete all existing hotels data
  await Hotels.deleteMany({});

  const hotels = [];

  // For each city, generate 5 random hotels
  CITIES.forEach((city) => {
    for (let i = 0; i < 5; i++) {
      // generate random amenities
      const amenities = [];
      HOTEL_AMENITIES.forEach((amenity) => {
        if (Math.random() < 0.5) {
          amenities.push(amenity);
        }
      });

      // generate random hotel document for mongoDB
      const hotel = {
        city,
        name: "Hotel " + String(i + 1),
        address: "Address " + String(i + 1) + ", " + CITIES_MAP[city],
        stars: Math.floor(Math.random() * 5) + 1, // random number between 1 and 5
        rating: Math.floor(Math.random() * 10) + 1, // random number between 1 and 10
        amenities,
        price_per_night: 50 + Math.floor(Math.random() * 200), // random price between $50 and $250
      };

      hotels.push(hotel);
    }
  });

  try {
    // insert all hotels into the database together (faster than inserting one by one)
    await Hotels.insertMany(hotels);

    // Note: if we had to write the above data into a json file (as asked in the task), we can use the below code:
    const fs = require("fs");
    const data = JSON.stringify(hotels);
    fs.writeFileSync("hotels.json", data, (err) => {
      if (err) throw err;
      console.log("The file has been saved!");
    });

    return res.status(200).send("Hotels Data Generated");
  } catch (err) {
    console.error(err);
    return res.status(400).send("Error in generating hotels data");
  }
};
