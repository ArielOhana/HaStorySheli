const Users = require("../models/userModel");
const Books = require("../models/bookModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

const saltRounds = 11;

exports.createUser = async (req, res) => {
    try {
        const {
            username,
            displayName,
            email,
            password,
            profileImg,
            birthDate,
            about,
        } = req.body;
        const usernameExist = await Users.findOne({ username });
        const emailExist = await Users.findOne({ email });
        if (usernameExist) {
            return res
                .status(400)
                .json({ status: false, message: "שם משתמש תפוס" });
        } else if (emailExist) {
            return res
                .status(400)
                .json({ status: false, message: "כתובת המייל תפוסה" });
        } else {
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const newUser = await Users.create({
                username,
                displayName,
                email,
                profileImg,
                birthDate,
                about,
                password: hashedPassword,
            });
            const emailToken = jwt.sign(
                { _id: newUser._id.toString() },
                process.env.SECRET_JWT_KEY,
                {
                    expiresIn: "24h",
                }
            );
            sendEmailVerification(newUser.email, emailToken);
            res.status(201).json({
                status: true,
                message: "החשבון נוצר בהצלחה, נא לאמת את חשבון המייל",
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

exports.updateThisUser = async (req, res) => {
    try {
        const {
            username,
            displayName,
            email,
            password,
            profileImg,
            birthDate,
            about,
        } = req.body;
        const newUser = await Users.updateOne({
            username,
            displayName,
            email,
            profileImg,
            birthDate,
            about,
            // password: hashedPassword,
        });
        res.send(newUser);
    } catch (error) {
      console.error("Error editing User:", error);
      res.status(500).send("Internal Server Error");
    }
  };

  async function sendEmailVerification(toEmail, emailToken) {
    try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.MYEMAIL,
            pass: process.env.MYEMAIL_PASSWORD,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
    
        const mailOptions = {
          from:  process.env.MYEMAIL,
          to: toEmail,
          subject: 'Email Verification',
          text: `Hey, \nPlease click the following link to verify your email:\n ${process.env.SERVER_ADDRESS}/users/verify/${emailToken}`,
        };
    
        const info = await transporter.sendMail(mailOptions);
      } catch (error) {
        console.error('Email verification error:', error);
      }
    }

exports.Signin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await Users.findOne({ username });

        if (!user) {
            return res.status(401).json({
                status: false,
                message: "שם משתמש אינו קיים",
            });
        } else if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign(
                { _id: user._id },
                process.env.SECRET_JWT_KEY,
                {
                    expiresIn: "24h",
                }
            );
            if (user.verified) {
                res.cookie("token", token, {
                    httpOnly: true,
                    maxAge: 864000,
                    sameSite: "none",
                    secure: true,
                });
                res.status(200).send({
                    status: true,
                    message: "Logged in successfully",
                });
            } else {
                return res.status(402).json({
                    status: false,
                    message: "אנא אמת את המייל שלך",
                });
            }
        } else {
            return res.status(402).json({
                status: false,
                message: "סיסמא שגויה",
            });
        }
    } catch (error) {
        res.status(400).json({
            status: false,
            message: "An error occurred during login",
            error: error,
        });
    }
};

exports.signout = async (req, res) => {
    try {
        res.cookie("token", "none", {
            httpOnly: true,
            maxAge: 1,
            sameSite: "none",
            secure: true,
        });
        res.status(200).send({
            status: true,
            message: "Signout successfully",
        });
    } catch (error) {
        res.status(400).json({
            status: false,
            message: "An error occurred during signout",
            error: error,
        });
    }
};


exports.verifyToken = async (req, res, next) => {
    const token = req.cookies.token;
    console.log()
    if (!token) {
        return res
            .status(401)
            .json({success:false,type:'error', message: "Unauthorized: No token provided" });
    }
    try {
        const decodedToken = jwt.verify(token, process.env.SECRET_JWT_KEY);
        const user = await Users.findById(decodedToken._id);
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({success:false,type:'error', message: "Unauthorized: Invalid token" });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const verificationToken = req.params.token;
        const decoded = jwt.verify(
            verificationToken,
            process.env.SECRET_JWT_KEY
        );

        const userId = decoded._id;

        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { verified: true },
            { new: true }
        );

        if (updatedUser) {
            // Send an HTML response
            return res.send(`
        <html>
          <head>
            <title>Email Verification</title>
          </head>
          <body>
            <h1>Email Verification Successful</h1>
            <p>Your email has been successfully verified. You can now log in.</p>
          </body>
        </html>
      `);
        } else {
            // Send an HTML response for error
            return res.status(404).send(`
        <html>
          <head>
            <title>Email Verification Error</title>
          </head>
          <body>
            <h1>Error</h1>
            <p>User not found or not updated.</p>
          </body>
        </html>
      `);
        }
    } catch (error) {
        console.error("Error verifying user:", error);
        // Send an HTML response for internal server error
        res.status(500).send(`
      <html>
        <head>
          <title>Internal Server Error</title>
        </head>
        <body>
          <h1>Error</h1>
          <p>Internal Server Error</p>
        </body>
      </html>
    `);
    }
};

exports.toggleLikedBook = async (req, res) => {
    try {
        const { bookId } = req.body;
        const userId = req?.user?._id;

        if (!userId) {
            return res
                .status(200)
                .send({ message: "Must log in to like", type: "error" });
        }
        const userExists = await Users.exists({ _id: userId });
        const bookExists = await Books.exists({ _id: bookId });
        if (!userExists || !bookExists) {
            return res
                .status(200)
                .send({ message: "Must log in to like", type: "error" });
        }

        const user = await Users.findById(userId);
        const book = await Books.findById(bookId);
        if (user.likedBooks.includes(bookId)) {
            // If already liked, remove it from likedBooks and decrement likes
            await Users.findByIdAndUpdate(userId, {
                $pull: { likedBooks: bookId },
            });

            await Books.findByIdAndUpdate(bookId, {
                $inc: { likes: -1 },
            });

            res.status(200).send({
                type: "error",
                message: "Book removed from likedBooks",
                likes: book.likes - 1,
            });
        } else {
            // If not liked, add it to likedBooks and increment likes
            await Users.findByIdAndUpdate(userId, {
                $push: { likedBooks: bookId },
            });

            await Books.findByIdAndUpdate(bookId, {
                $inc: { likes: 1 },
            });

            res.status(200).send({
                type: "success",
                message: "Book added to likedBooks",
                likes: book.likes + 1,
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Internal Server Error" });
    }
};

exports.getThisUser = async (req, res) => {
    try {
        res.status(202).json({ user: req.user });
    } catch (error) {
        res.status(407).json({
            message: "Getting this user has failed",
            error: error,
        });
    }
};

exports.checkifIlike = async (req, res) => {
  try {
    const userId = req.user._id;
    const bookId = req.body.bookId;
    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).send({ message: 'User not found', type: 'error' });
    }

    const userLikedBook = user.likedBooks.includes(bookId);

    res.status(200).send({
      liked: userLikedBook,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
};
exports.getMyBooks = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found', type: 'error' });
    }
    const myBookIds = user.myBooks;
    const myBooks = await Books.find({ _id: { $in: myBookIds } });

    res.status(200).json({ myBooks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};