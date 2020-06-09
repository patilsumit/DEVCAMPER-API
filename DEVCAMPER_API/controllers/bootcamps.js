const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const geocoder = require('../utils/geocoder');

const Bootcamp = require('../models/Bootcamp');


//Get All Bootcamps
exports.getBootcamps = asyncHandler(async (req, res, next) => {
    res.status(200).json(res.advancedResults);
});

//Get Single Bootcamp
exports.getBootcamp = asyncHandler(async (req, res, next) => {
    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
        return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: bootcamp
    });


});

//Create New Bootcamp
exports.createBootcamp = asyncHandler(async (req, res, next) => {

    //Add user to req body
    req.body.user = req.user.id;

    //Check for published bootcamp
    const publishedBootcamp = await Bootcamp.findOne({user: req.user.id});

    //If the user is not admin ,they can add only one bootcamp
    if (publishedBootcamp && req.user.role !== 'admin') {
        return next(new ErrorResponse(`The user with ID ${req.user.id} has already published a bootcamp `, 400));
    }

    // try {
    const bootcamp = await Bootcamp.create(req.body);

    res.status(200).json({
        success: true,
        data: bootcamp
    });
    // } catch (err) {
    //     next(err);
    // }
});

exports.updateBootcamp = asyncHandler(async (req, res, next) => {

    let bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
        return next(
            new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is bootcamp owner
    if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(
                `User ${req.params.id} is not authorized to update this bootcamp`,
                401
            )
        );
    }


    bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!bootcamp) {
        return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
    }


    res.status(200).json({
        success: true,
        data: bootcamp
    });

});

exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
    let bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
        return next(
            new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is bootcamp owner
    if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(
                `User ${req.params.id} is not authorized to delete this bootcamp`,
                401
            )
        );
    }

     bootcamp = await Bootcamp.findByIdAndDelete(req.params.id);

    if (!bootcamp) {
        return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
    }

    bootcamp.remove();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// Photo upload for Bootcamp
// route /api/v1/bootcamps/:id/photo
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => {

    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
        return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is bootcamp owner
    if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(
                `User ${req.params.id} is not authorized to update this bootcamp`,
                401
            )
        );
    }

    if (!req.files) {
        return next(new ErrorResponse(`Please uplaod a file`, 400));
    }

    const file = req.files.file;
     console.log(file)
    //Make sure the image is a photo
    if (!file.mimetype.startsWith('image')) {
        return next(new ErrorResponse(`Please uplaod a Image file`, 400));
    }

    // Check filesize
    if (file.size > process.env.MAX_FILE_UPLOAD) {
        return next(
            new ErrorResponse(
                `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
                400
            )
        );
    }

    //Create Custom filename
    file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

    file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
        if (err) {
            console.error(err);
            return next(new ErrorResponse(`Problem with file upload`, 500))
        }
    });

    await Bootcamp.findByIdAndUpdate(req.params.id, {photo: file.name});

    res.status(200).json({success: true, data: file.name});
});

// @desc      Get bootcamps within a radius
// @route     GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access    Private
exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => {
    const {zipcode, distance} = req.params;

    //Get lat/long from geocoder
    const loc = await geocoder.geocode(zipcode);
    const lat = loc[0].latitude;
    const lng = loc[0].longitude;

    //calculate radius using radius
    //Divide dist by radius of Earth
    //Earth radius = 3963 mi / 6368 km;

    const radius = distance / 3963;

    const bootcamps = await Bootcamp.find({
        location: {$geoWithin: {$centerSphere: [[lng, lat], radius]}}
    });

    res.status(200).json({success: true, count: bootcamps.length, data: bootcamps})

});


