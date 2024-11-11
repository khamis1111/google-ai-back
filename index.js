import express from 'express';
import ExpressMongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import routesMount from './routes/index.js';
import ApiError from './utils/apiError.js';
import connectToDatabase from './config/database.js';

const app = express()

// Env
dotenv.config({ path: 'config.env' })
// Parse Str as Json Middleware
app.use(express.json())

// Protect Parameters
// app.use(hpp({ whitelist: ['age', 'price', 'paid', 'restOfPrice'] }));

// To remove data using Data Sanitize:
app.use(ExpressMongoSanitize());
app.use(xss())

// Use Helmet!
app.use(helmet());

// Enable other domains to access myApp
app.use(cors({ path: '*' }));
app.options('*', cors());

// Compress all response
app.use(compression())

const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    limit: 5, // Limit each IP to 20 requests per `window` (here, per 5 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { status: "Fail", msg: `Too many requests have been made. Please wait 10 minutes` }
})
app.use('/api/v1/auth', limiter) /* use with all requests start with /api */

// Routes
routesMount(app)

// Error Handles
app.all('*', (req, res, next) => {
    const err = new Error(`Can't find ${req.originalUrl}`)
    next(new ApiError(err), 400)
})
app.use((err, req, res, next) => {
    res.status(400).json(
        process.env.NODE_ENV === "development" ?
            {
                status: err.status || "error",
                message: err.message,
                stack: err.stack
            } :
            {
                status: err.status || "error",
                message: err.message,
            }
    )
})

const server = app.listen(process.env.PORT, () => {
    // Mongoose DB
    // connectToDatabase()
    console.log("Working....")
})

process.on('unhandledRejection', (err) => {
    console.log(`Rejection Error: ${err}`)
})
