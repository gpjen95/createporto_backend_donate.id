const fs = require("fs");
const sharp = require("sharp");
const { validationResult, body, param } = require("express-validator");

// models
const { funds } = require("../../app/db/models");

//management file upload
const { imgThumbUpload } = require("../midleware/multerConfig");

// validation create fund
exports.addFundImagesValidation = (req, res, next) => {
  imgThumbUpload(req, res, (err) => {
    let errSchema = {
      status: "failed",
      message: "failed validate file or form",
    };

    if (req.fileVallidationError) {
      errSchema.message = req.fileVallidationError;
      return res.status(400).json(errSchema);
    } else if (req.files.length === 0 && !err) {
      errSchema.message = "please select image uploads";
      return res.status(400).json(errSchema);
    }

    if (err) {
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        errSchema.message = `max file select is 3 file`;
        return res.status(400).json(errSchema);
      } else if (err.ccode === "LIMIT_FILE_SIZE") {
        errSchema.message = `limit file size is 5 Mb`;
        return res.status(400).json(errSchema);
      }
      errSchema.message = err;
      return res.status(400).json(errSchema);
    }
    return next();
  });
};

exports.addFundBodyValidation = [
  body("tittle")
    .notEmpty()
    .withMessage("tittle is require")
    .bail()
    .isLength({ min: 3 })
    .withMessage("tittle min 3 character")
    .escape(),
  body("goal")
    .notEmpty()
    .withMessage("goal is require")
    .bail()
    .isNumeric()
    .withMessage("goal must be number")
    .trim(),
  body("desc")
    .notEmpty()
    .withMessage("desc is require")
    .bail()
    .isString()
    .withMessage("desc must be string")
    .escape(),

  (req, res, next) => {
    const error = validationResult(req);
    const removeFile = () => {
      req.files.map((file) => {
        fs.unlinkSync(file.path, (err) => {
          if (err) console.log("==> ", err);
        });
      });
    };
    if (!error.isEmpty()) {
      //remove images
      removeFile();
      //response error validate
      return res.status(400).json({
        status: "failed",
        message: "failed validation form",
        error: error.errors,
      });
    }
    //resize and compress file image 600*x
    req.files.map((file) => {
      sharp(file.path)
        .resize(600)
        .toFile(`./public/images/img_thumb/${file.filename}`, (err, info) => {
          if (err) console.log("> ", err);
          // remove images
          fs.unlinkSync(file.path, (err) => {
            if (err) console.log("> ", err);
          });
        });
    });
    next();
  },
];

// validation id param
exports.fundIdValidation = [
  param("id")
    .trim()
    .isNumeric()
    .withMessage("params must be number")
    .bail()
    .custom(async (val) => {
      const fundId = await funds.findOne({
        where: {
          id: val,
        },
      });
      if (!fundId) {
        return Promise.reject("invalid params Id");
      }
    }),
  (req, res, next) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return res.status(400).json({
        status: "failed",
        message: "failed param validation",
        error: error.errors,
      });
    }
    next();
  },
];
