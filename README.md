# Circuit breaker implementation

## Variations

- Count based
- Time based

## File structure

#### api.js

- This file has a basic express server running on port 3030. THis is designed to respond with a 200 or 400 status in a random fashion

#### index.js

- This file initialized the CircuitBreaker class and passed the config options. This is designed to run the circuit breaker in intervals. the interval timing can be configured using the config file.

#### config.js

- This is the configuration file. The config params can be set here

#### cirrcuit-breaker.js

- This is the main circuit breaker file that has the circuit breaker logic.

## Running the program

1. Ensure all config params are set as per need.
2. If node js is not installed please install latest version of node js(https://nodejs.org/en/download/)
3. Run run.sh file to run the program
