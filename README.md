# travel-search-web

To run the project: `npm run dev`

After taking the source, destination, budget and duration as input, the application will return the best round-trip flight and hotel combination for the given inputs. User's can sort these results based on price, stars and rating.

### Functionality:

- `getFlights()`: Returns all flights from source to destination and destination to source. Optimization: We run a single query to get to and fro flights.
- `getHotels()`: Returns all hotels in the destination city. Optimization: We limit the number of hotels fetched by capping the price with the remaining budget after booking the flight.
- `getFlightsAndHotels()`: Returns best round trip flight and hotel combination for the given inputs. This calls the above two functions **only once** and then filters the results based on the budget and duration.

### Tech Stack:

- Node.js
- Express
- MongoDB

### Folder Structure:

- `frontend` - Frontend code
- `controllers` - Contains all the controllers
- `models` - Contains all the models
- `index.js` - The main entry point of the application
- `data` - Contains the JSON data generated for the database
