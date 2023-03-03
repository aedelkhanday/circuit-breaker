const express = require('express');

var app = express();

app.get("/", (req, res, next) => {
  Math.random() > 0.6 ?  res.status(200).send('success') : res.status(400).send('failure');
});

app.listen(3020, () => {
  console.log('Server running on port 3020');
});