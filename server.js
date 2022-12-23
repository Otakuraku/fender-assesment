const port = 3000;
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const ApiConnector = require('api-connector');
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");

const hbs = require("hbs");
hbs.registerPartials(path.resolve("./views/partials"));

const app = global.app = express();

const oneWeek = 1000 * 60 * 60 * 24 * 7;

//Setup session
app.use(session({
    secret: "thisfenderassesmentsecret9876yhrjncg",
    saveUninitialized: true,
    cookie: { maxAge: oneWeek },
    resave: false
}));

//Setup json parser
app.use(express.json());

//Setup "static" files path
app.use(express.static(path.resolve("./public")));

//Setup body parser
app.use(bodyParser.urlencoded( { extended: false } ) );

//Setup cookie parser
app.use(cookieParser());

//Setup handlebars as view engine
app.set('view engine','hbs');

//Setup router paths
app.use("/",indexRouter);
app.use("/user",usersRouter);

//Start server
app.listen( port, () => {
    console.log(`-- App started, listening on: ${port}`);
});