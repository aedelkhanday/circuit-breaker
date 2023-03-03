function log(result, data) {
  console.log('\n------------------------------------------------');
    const retval = {
      ...data,
      result
    };
    console.log(retval);
    return retval;
}

module.exports = log;