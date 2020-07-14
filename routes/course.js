'use strict';

const express = require('express');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');
const { check, validationResult } = require('express-validator');

const Course = require('../db').Course;

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
        const user = await User.findOne({
            where: { emailAddress: credentials.name }
        });
        // If a user was successfully retrieved from the data store...
        if (user) {
            const authenticated = bcryptjs
                .compareSync(credentials.pass, user.password);
            // If the passwords match...
            if (authenticated) {
                console.log(`Authentication successful for username: ${user.emailAddress}`);
                // store the retrieved user object on the request object
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

    // If user authentication failed...
    if (message) {
        console.warn(message);

        // Return a response with a 401.
        res.status(401).json({ message: 'Access Denied, Please Log in' });
    } else {

        // Call the next() method if autherntication suceeds .
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

//COURSE ROUTES
router.get('/courses', asyncHandler(async (req, res) => {
    const courses = await Course.findAll({ //finds all courses
        attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded', 'userId'],
        include: [{
            attributes: ['id', 'firstName', 'lastName', 'emailAddress'],
            model: User,
        }],
    });
    res.status(200).json(courses); //sets 200 status and shows the list of courses
}));

//  shows one chosen course, status 200
router.get('/courses/:id', asyncHandler(async (req, res, next) => {
    const course = await Course.findByPk(req.params.id, {
        attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded', 'userId'],
        include: [{
            attributes: ['id', 'firstName', 'lastName', 'emailAddress'],
            model: User,
        }],
    }); //finds course by given id
    //console.log(req.params.id);

    course
        ? res.status(200).json(course) //shows chosen course
        : res.status(404).json({ message: 'Course Not found' }) //shows error message when course doesn't exist

}));

// creates a new course, sets the Location header to the URI for the course, returns no content, status 201
router.post('/courses', [
    check('title')
        .exists({ checkNull: true })
        .withMessage('Please provide a value for "title"'),
    check('description')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "description"'),

], authenticateUser, asyncHandler(async (req, res, next) => {
    // Attempt to get the validation result from the Request object.
    const errors = validationResult(req);
    try {
        // If there are validation errors...
        if (!errors.isEmpty()) {
            // Use the Array `map()` method to get a list of error messages.
            const errorMessages = errors.array().map(error => error.msg);
            return res.status(400).json({ errors: errorMessages });
        }

        let course;

        course = await Course.create(req.body); //creates new course
        console.log(req.body);
        console.log(course);
        const id = course.id;
        res.location(`/courses/${id}`).status(201).end(); //sets URI and gives 201 status
    } catch (error) {
        throw error; // error caught in the asyncHandler's catch block
    }

}));

// updates existing, chosen course, returns no content, status 204
router.put('/courses/:id', [
    check('title')
        .exists({ checkNull: true })
        .withMessage('Please provide a value for "title"'),
    check('description')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "description"'),

], authenticateUser, asyncHandler(async (req, res, next) => {
    // Attempt to get the validation result from the Request object.
    const errors = validationResult(req);
    try {
        // If there are validation errors...
        if (!errors.isEmpty()) {
            // Use the Array `map()` method to get a list of error messages.
            const errorMessages = errors.array().map(error => error.msg);
            return res.status(400).json({ errors: errorMessages });
        }

        let course;
        const user = req.currentUser;

        course = await Course.findByPk(req.params.id); //finds course with given id
        if (course) {
            if (course.userId === user.id) {
                await course.update(req.body); //updates course with given id
                res.status(204).end();
            } else {
                return res.status(403).json({ message: 'Sorry! You cannot make changes in other users courses' });
            }
        } else {
            res.status(404).json({ message: 'Course Not Found' }); //shows error when course doesn't exist
        }
    } catch (error) {
        throw error; // error caught in the asyncHandler's catch block
    }
}));

//  deletes chosen course, returns no content, status 204
router.delete('/courses/:id', authenticateUser, asyncHandler(async (req, res, next) => {
    try {
        let course;
        const user = req.currentUser;

        course = await Course.findByPk(req.params.id); //find a course with given id
        if (course) {
            if (course.userId === user.id) {
                await course.destroy(); //deletes course
                res.status(204).end();
            } else {
                return res.status(403).json({ message: 'Sorry! You cannot make changes in other users courses' });
            }
        } else {
            res.status(404).json({ message: 'Course Not Found' }) //shows error when course doesn't exist
        }
    } catch (error) {
        throw error; // error caught in the asyncHandler's catch block
    }
}));
module.exports = router;
