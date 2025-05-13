require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const { logger } = require ('./middleware/logEvents');
const errorHandler = require ('./middleware/errorHandler');
const mongoose = require('mongoose');
const connectDB = require('./config/dbCon');
const PORT = process.env.PORT || 3500;

//Connect to DB
connectDB();

app.use(logger); // custom middleware logger

app.use(cors()); // left open for any origin for public API (no white list on purpose)

app.use(express.urlencoded({ extended:false })); //form data

app.use(express.json()); //json 

app.use('/', express.static(path.join(__dirname, '/public'))); //static files

//routes
app.use('/', require('./routes/root'));
app.use('/states', require('./routes/api/states'));


app.all('*', (req, res) => {
    res.status(404);
    if (req.accepts('html')){
        res.sendFile(path.join(__dirname, 'views', '404.html'));
    }else if (req.accepts('json')){
        res.json({ error: "404 Not Found" });
    } else {
        res.type('txt').send("404 Not Found");
    }
});

app.use(errorHandler);

mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});


