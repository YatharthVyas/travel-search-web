# travel-search-web

To run the project: `npm run dev`

After taking the source, budget and duration of trip as input, the application will return the best round-trip flight and hotel combinations.

### Functionality:

- `getFlights()`: Returns all flights to/from source to destination and destination to source. Optimization: We run a single query to get all these to and fro flights.
- `getHotels()`: Returns all hotels in the destination city. Optimization: We limit the number of hotels fetched by capping the price with the remaining budget after booking the flight.
- `getFlightsAndHotels()`: Returns best round trip flight and hotel combination for the given inputs. This calls the above two functions **only once** and then filters the results based on the budget and duration. All trip combinations are sorted based on the total score of the flight and hotel. The score is calculated as explained below:

<br/>
To find the best hotels, we maintian a new field `score` in the hotel schema. This field is calculated as follows:

- `score = (rating * 50) + (stars * 20) + (price * -0.1)`. This is done to give a positive weightage to rating and stars and less weightage to price. Similar to how heurestics are used in A\* search algorithm to compare two nodes, we use this score to compare two hotels.
- `rating` and `stars` are the rating and stars of the hotel respectively.

Similarly, for the best flights, we maintain a new field `score` in the flight schema. This field is calculated as follows:

- `score = (length(stops) * -100) + (duration * -200) + (price * -0.1)`. This is done to give a positive weightage to number of stops and less weightage to price.

Future Scope:

- We can incorporate number of users that have booked the hotel in the past to calculate the score. This will add an extra metric for popularity and it will also make the ratings more reliable.
- The weights associated to rating, stars and price in calculating score can be better evaluated using some machine learning algorithm which aims to optimize the ratings left by the users that book the trip combinations.
- These results can be cached server side as for a given source and budget, the results will not change much. This will reduce the number of queries to the database and will also reduce the response time.

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
