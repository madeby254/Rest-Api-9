'use strict';

// load modules
const express = require('express');
const morgan = require('morgan');
const sequelize = require('./db').sequelize;

const userRouter = require('./routes/user');
const courseRouter = require('./routes/course');



// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

// create the Express app
const app = express();
//gives access to req itp
app.use(express.json());

// setup morgan which gives us http request logging
app.use(morgan('dev'));

console.log('Testing the connection to the database...');
(async () => {
  try {
    // all asynchronous calls made with Sequelize
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Connection to the database successful!');
  } catch (error) {
    // Sequelize validation errors
    console.log('Connection to the database failed!');
    throw error;
  }
})();

// Add routes.


app.use('/api', userRouter);
app.use('/api', courseRouter);

// setup a friendly greeting for the root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the REST API project!',
  });
});


// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

// setup a global error handler
app.use((err, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }

  res.status(err.status || 500).json({
    message: err.message,
    error: {},
  });
});

// set our port
app.set('port', process.env.PORT || 5000);

// start listening on our port
const server = app.listen(app.get('port'), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});


