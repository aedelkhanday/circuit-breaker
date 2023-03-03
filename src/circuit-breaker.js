const axios = require('axios');
const log = require('../logger');

const { 
  BREAKER_STATE,
  DEFAULT_FAILURE_THRESHOLD,
  DEFAULT_SUCCESS_THRESHOLD,
  DEFAULT_TIMEOUT,
  DEFAULT_CIRCUIT_BREAKER_VARIATION,
  CIRCUIT_BREAKER_VARIATIONS,
  DEFAULT_TIMER_BASED_THRESHOLD,
} = require('../config');

module.exports = class CircuitBreaker {
  constructor(options) {
    console.log('Setting config params...');

    this.breakerState = BREAKER_STATE.CLOSED; // Default circuit breaker state
    this.successCounter = 0;
    this.failureCounter = 0;
    this.nextAttemptAt = Date.now();
    this.startTimer = 0;

    this.totalRequests = 0;
    this.totalFailedRequests = 0;
    this.totalSuccessfulRequests = 0;

    this.maxFailureThreshold = options.maxFailureThreshold
      ? options.maxFailureThreshold
      : DEFAULT_FAILURE_THRESHOLD;
  
    this.maxSuccessThreshold = options.maxSuccessThreshold
      ? options.maxSuccessThreshold
      : DEFAULT_SUCCESS_THRESHOLD;
  
    this.timeout = options.timeout ? options.timeout : DEFAULT_TIMEOUT;

    // Timer threshold in case of a timer based circuit breaker
    this.timeBasedBreakerThreshold = options.timeBasedBreakerThreshold ? options.timeBasedBreakerThreshold : DEFAULT_TIMER_BASED_THRESHOLD;
    this.circuitBreakerVariation = options.variation ? options.variation : DEFAULT_CIRCUIT_BREAKER_VARIATION;

    console.log(`Running [${this.circuitBreakerVariation}] Circuit breaker variation...` );
  }

  /**
   * A fallback function when the API requests are not served because of circuit trip.
   * @param {*} message 
   * @returns 
   */
  fallback(message) {
    const defaultMessage = "The service is not able to process this request at the moment!";
    return {
      status: 503,
      message: message ? message : defaultMessage,
    };
  }

  getInfo() {
    const totalSuccessPercentage = Math.floor((this.totalSuccessfulRequests/this.totalRequests) * 100);
    const totalFailurePercentage = Math.floor((this.totalFailedRequests/this.totalRequests) * 100);
    return {
      state: this.breakerState,
      currentSuccessCounter: this.successCounter,
      currentFailureCounter: this.failureCounter,
      totalRequests: this.totalRequests,
      totalSuccessPercentage,
      totalFailurePercentage
    };
  }

  pass(data) {
    console.log('CircuitBreaker:: pass BEGIN');
    
    this.failureCounter = 0;
    this.totalSuccessfulRequests++;
    this.startTimer = 0;
    
    if (this.breakerState == BREAKER_STATE.HALF_OPEN) {
      this.successCounter++;

      if (this.successCounter >= this.maxSuccessThreshold) {
        this.successCounter = 0;
        this.breakerState = BREAKER_STATE.CLOSED;
      }
    }

    log('SUCCESS', this.getInfo());

    return data;
  }

  /**
   * This method ttracks the failures of the circuit and switches it to OPEN if thresholds are breached. 
   * @param {*} data 
   * @returns 
   */
  fail(data) {
    console.log('CircuitBreaker:: fail BEGIN');
    this.failureCounter++;
    this.totalFailedRequests++;

    switch(this.circuitBreakerVariation) {
      case (CIRCUIT_BREAKER_VARIATIONS.COUNT_BASED): {
        if (this.failureCounter > this.maxFailureThreshold) {
          this.breakerState = BREAKER_STATE.OPEN;
    
          this.nextAttemptAt = Date.now() + this.timeout;
        }
        break;
      }
      case (CIRCUIT_BREAKER_VARIATIONS.TIME_BASED): {
        if (this.startTimer) {
          if (Date.now() - this.startTimer <= this.timeBasedBreakerThreshold
                && this.failureCounter > this.maxFailureThreshold) {
            this.breakerState = BREAKER_STATE.OPEN;
    
            this.nextAttemptAt = Date.now() + this.timeout;
          }
        } else this.startTimer = Date.now();

        break;
      }
      default: console.log('No idea how to handle this type');
    }

    log('FAILED', this.getInfo());
    return data;
  }

  /**
   * This method runs the main circuit breaker functionality. It checks if the circuit is closed to
   * serve requests. If it finds it OPEN, it fallback to internal method. It also switches the circuit to HALF_OPEN
   * state if the timeout threshold is reached.
   * @param {*} request 
   * @returns fn 
   */
  async execute(request) {
    this.totalRequests++;

    if (this.breakerState === BREAKER_STATE.OPEN) {
      
      if (this.nextAttemptAt <= Date.now()) {
        this.breakerState = BREAKER_STATE.HALF_OPEN;
      } else {
        return this.fallback("System is down. Try again later!");
      }
    }

    try {
      const response = await axios(request);

      if (response.status === 200) return this.pass(response.data);
      return this.fail(response.data);
    } catch (err) {
      console.log('Error encountered in API request!');

      return this.fail(err.message);
    }
  }
}
