const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const AuthRouter = require('./Routes/AuthRouter');
const ProductRouter = require('./Routes/ProductRouter');
const SearchRouter = require('./Routes/SearchRouter');

require('dotenv').config();
require('./Models/db');
const PORT = process.env.PORT || 8082;

app.get('/ping', (req, res) => {
    res.send('PONG');
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use('/auth', AuthRouter);
app.use('/products', ProductRouter);
app.use('/search', SearchRouter);

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})