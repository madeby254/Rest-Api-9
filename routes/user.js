'use strict';

const express = require('express');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');
const { check, validationResult } = require('express-validator');

const User = require('../db').User;

// router instance.
const router = express.Router();

// Authenticate User Middleware
const authenticateUser = async (req, res, next) => {

    let message = null;

    // Parse the user's credentials from the Authorization header.
    const credentials = auth(req);

    // If the user's credentials are available...
    if (credentials) {
        // Attempt to retrieve the user from the data store
        const user = await User.findOne({
            where: { emailAddress: credentials.name }
        });

        // If a user was successfully retrieved from the data store...
        if (user) {
            // Use the bcryptjs npm package to compare the user's password
            const authenticated = bcryptjs
                .compareSync(credentials.pass, user.password);


            // If the passwords matches
            if (authenticated) {
                console.log(`Authentication successful for username: ${user.emailAddress}`);
                req.currentUser = user;
            } else {
                message = `Authentication failure for username: ${user.emailAddress}`;
            }
        } else {
            message = `User not found for username: ${credentials.name}`;
        }
    } else {
        message = 'Auth header not found';
    }

    // If user authentication fails
    if (message) {
        console.warn(message);

        // Return a response with a 401
        res.status(401).json({ message: 'Access Denied, Please Log in' });
    } else {
        // Call the next() method if suceeds .
        next();
    }
};

/* Handler function to wrap each route. */
function asyncHandler(callbackF) {
    return async (req, res, next) => {
        try {
            await callbackF(req, res, next)
        } catch (error) {
            res.status(500).send(error);
        }
    }
}


//USER ROUTES
// GET api/users shows the current authenticate user, status 200
router.get('/users', authenticateUser, asyncHandler(async (req, res) => {
    const user = req.currentUser; //current user

    res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddress
    }).status(200);
}));
// creates new user, sets the Location header to / and returns no content, status 201

router.post('/users', [
    check('firstName')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "firstName"'),
    check('lastName')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "lastName"'),
    check('emailAddress')
        .isEmail() //checks for email format
        .withMessage('Please provide valid "emailAddress"')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "emailAddress"'),
    check('password')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "password"'),
], asyncHandler(async (req, res) => {

    // Attempt to get the validation result from the Request object.
    const errors = validationResult(req);
    try {

        // If there are  errors...
        if (!errors.isEmpty()) {
            // Use the Array `map()` method to get a list of error messages.
            const errorMessages = errors.array().map(error => error.msg);
            return res.status(400).json({ errors: errorMessages });
        }

        // Get user req body
        const user = await req.body;

        // Hash the password.
        user.password = bcryptjs.hashSync(user.password);

        // Add the user to the `users` array.
        await User.create(user);

        // Set the status to 201 Created and end the response.
        return res.location(`/`).status(201).end();
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") { //checks if email is already in a database
            return res.status(422).json({ message: 'Email address must be unique' });
        } else {
            throw error;
        }
    }
}));

module.exports = router;
