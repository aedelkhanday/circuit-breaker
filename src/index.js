const CircuitBreaker = require('./circuit-breaker');
const { RUNNER_TIMEOUT } = require('../config');
const apiOptions = {
  method: 'get',
  url: 'http://localhost:3020'
};

const config = {
  maxFailureThreshold: 2,
  maxSuccessThreshold: 3,
  timeout: 1000
}

const circuitBreaker = new CircuitBreaker(config);

setInterval(() => {
  circuitBreaker
      .execute(apiOptions)
      .then( console.log )
      .catch( console.error )
}, RUNNER_TIMEOUT);