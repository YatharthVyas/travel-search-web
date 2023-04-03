const Flights = require("../models/flights");
const Hotels = require("../models/hotels");

const { CITIES, CITIES_MAP, HOTEL_AMENITIES } = require("../constants");
/*
 * GET /flights
 * Returns a list of flights from the given origin to the given destination on the given date
 * Query Parameters:
 * - from: the origin airport
 * Returns:
 * - flights: dictionary of flights matching the query parameters grouped by destination
 */
exports.getFlights = async (from) => {
  try {
    // get flights grouped by destination
    const flights = await Flights.aggregate([
      {
        $match: {
          $or: [{ from }, { to: from }],
        },
      },
      {
        $group: {
          _id: "$from",
          flights: {
            $push: {
              from: "$from",
              to: "$to",
              stops: "$stops",
              price: "$price",
              departure_time: "$departure_time",
              arrival_time: "$arrival_time",
              score: "$score",
            },
          },
        },
      },
      {
        $sort: {
          "flights.price": 1,
        },
      },
    ]);

    return flights;
  } catch (err) {
    console.error(err);
    return [];
  }
};

/*
 * GET /hotels
 * Returns a list of hotels in the given city sorted by price
 * Query Parameters:
 * - from: the source city
 * - remainingBudget: the remaining budget after subtracting flight price
 * Returns:
 * - hotels: list of hotels matching the query parameters
 *
 */
exports.getHotels = async (from, remainingBudget) => {
  const hotels = await Hotels.find({
    $nor: [{ address: { $regex: CITIES_MAP[from], $options: "i" } }],
    price_per_night: { $lte: remainingBudget },
  }).sort({ score: -1 });

  // group hotels by city:
  const hotelsByCity = {};
  hotels.forEach((hotel) => {
    for (const city of CITIES) {
      if (hotel.address.includes(CITIES_MAP[city])) {
        if (hotelsByCity[city]) {
          hotelsByCity[city].push(hotel);
        } else {
          hotelsByCity[city] = [hotel];
        }
      }
    }
  });

  return hotelsByCity;
};

// Get Hotel and Flights:
/*
 * Query Parameters:
 * - from: the origin airport
 * - days: duration of stay
 * - budget: the budget for the trip
 * Returns:
 * - status: 200 on success
 * - content: list of hotels and flights matching the query parameters
 */
exports.getHotelAndFlights = async (req) => {
  const { from, budget, days } = req.query;

  const flights = await this.getFlights(from);
  if (flights.length == 0)
    return { data: {}, error: "Please increase your budget" };

  const sourceFlights = {};
  const destinationFlights = {};
  let minDestinationPrice = Infinity;
  let minSourceFlightPrice = Infinity;
  flights.forEach((flight) => {
    if (flight._id === from) {
      for (const _flight of flight.flights) {
        if (!sourceFlights[_flight.to]) sourceFlights[_flight.to] = [];
        sourceFlights[_flight.to].push(_flight);
        minSourceFlightPrice = Math.min(minSourceFlightPrice, _flight.price);
      }
    } else {
      if (!destinationFlights[flight._id]) destinationFlights[flight._id] = [];
      destinationFlights[flight._id].push(...flight.flights);
      minDestinationPrice = Math.min(
        minDestinationPrice,
        flight.flights[0].price
      );
    }
  });

  const maxAvailableBudget =
    (budget - minSourceFlightPrice + minDestinationPrice) / days;
  try {
    // get hotels in destination city sorted by price
    const hotels = await this.getHotels(from, maxAvailableBudget);

    if (hotels.length == 0) {
      return { data: {}, error: "Please increase your budget" };
    }

    const trips = [];
    // generate all possible trips using the flights and hotels
    for (const destination of Object.keys(destinationFlights)) {
      sourceFlights[destination].forEach((sourceFlight) => {
        destinationFlights[destination].forEach((destinationFlight) => {
          hotels[destination].forEach((hotel) => {
            const trip = {
              sourceFlight,
              destinationFlight,
              hotel,
              totalCost:
                sourceFlight.price +
                destinationFlight.price +
                hotel.price_per_night * days,
              totalScore:
                sourceFlight.score + destinationFlight.score + hotel.score,
            };
            if (trip.totalCost <= budget) trips.push(trip);
          });
        });
      });
    }

    // sort trips by score
    trips.sort((a, b) => b.totalScore - a.totalScore);

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

          // calculate score = (length(stops) * -100) + (duration * -200) + (price * -0.1)
          const duration =
            (arrival_time.hour - departure_time.hour) * 60 + // hours to minutes
            (arrival_time.minute - departure_time.minute); // minutes

          const price = 200 + Math.floor(Math.random() * 1300); // random price between $200 and $1500

          const score = stops.length * -100 + duration * -200 + price * -0.1;

          // generate flight document for mongoDB
          const flight = {
            from: fromCity,
            to: toCity,
            stops,
            price,
            departure_time:
              String(departure_time.hour) + ":" + String(departure_time.minute),
            arrival_time:
              String(arrival_time.hour) + ":" + String(arrival_time.minute),
            score,
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

      // calculate score = (rating * 50) + (stars * 20) + (price * -0.1)
      const rating = Math.floor(Math.random() * 10) + 1; // random number between 1 and 10
      const stars = Math.floor(Math.random() * 5) + 1; // random number between 1 and 5
      const price_per_night = 50 + Math.floor(Math.random() * 200); // random price between $50 and $250
      const score = rating * 50 + stars * 20 + price_per_night * -0.1;

      // generate random hotel document for mongoDB
      const hotel = {
        city,
        name: "Hotel " + String(i + 1),
        address: "Address " + String(i + 1) + ", " + CITIES_MAP[city],
        stars,
        rating,
        amenities,
        price_per_night,
        score,
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
