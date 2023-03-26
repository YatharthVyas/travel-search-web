const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const controllers = require("./controllers");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const xss = require("xss-clean");
const hpp = require("hpp");
const bodyParser = require("body-parser");
const { CITIES } = require("./constants");

const app = express();
const EXPRESS_PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/travel-wits");
let db = mongoose.connection;

db.on("error", (err) => {
  console.error("Error in Connecting to Databse...");
  console.error(err);
  console.log("DB Connection Error... Exiting");
  process.exit(1);
});

db.once("open", () => {
  console.log("Connected to Database...");
});

// Middleware
app.use(express.json({ extended: false, limit: "10mb" }));
app.use(morgan("dev"));
app.use(mongoSanitize());
app.use(helmet());
app.use(xss());
app.use(hpp());
app.engine("html", require("ejs").renderFile);
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", __dirname);

app.listen(EXPRESS_PORT, () => {
  console.log(`Express listening on Port ${EXPRESS_PORT}...`);
});

// Serve static files from the ejs frontend template
app.get("/", async (req, res) => {
  const { data, error } = await controllers.getHotelAndFlights(req);

  res.render("./frontend/index.ejs", {
    CITIES,
    from: req.query.from,
    to: req.query.to,
    trips: data.trips,
    error: error,
    budget: req.query.budget || 1000,
    days: req.query.days || 3,
    sortBy: req.query.sortBy || "rating",
  });
});

// Hit these endpoints to generate data
app.post("/api/generate-flights", controllers.generateFlightsData);
app.post("/api/generate-hotels", controllers.generateHotelsData);
