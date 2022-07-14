
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const register = require("./routes/register");
const login = require("./routes/login");
const path = require('path');
const products = require("./products");
const stripe = require("./routes/stripe");
const productsRoute = require("./routes/products");


const app = express();

require("dotenv").config();

app.use(express.json());
app.use(cors());

app.use("/api/register", register);
app.use("/api/login", login);
app.use("/api/stripe", stripe);
app.use("/api/products", productsRoute);


app.use(express.static('frontend/build'));
// let the react app to handle any unknown routes 
// serve up the index.html if express does'nt recognize the route

app.get('/', (req, res) => {
res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'));
});

app.get("/products", (req, res) => {
  res.send(products);
});

const uri = process.env.DB_URI;
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on port: ${port}...`);
});

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connection successfully..."))
  .catch((error) => console.error("MongoDB connection failed:", error.message));

// const express = require("express");

// const cors = require("cors");

// const mongoose = require("mongoose");
// const login = require("./routes/login");
// const register = require("./routes/register");



// const products = require("./products");

// const app = express();

// require("dotenv").config()

// app.use(express.json())
// app.use(cors());
// app.use("/api/register",register);
// app.use("/api/login",login);



// app.get("/",(req,res)=>{
//     res.send("welcome to the shopping mall......");
// })

// app.get("/products",(req,res)=>{
//     res.send(products);
// })

// const port = process.env.PORT || 5000
// const uri = process.env.DB_URI
// app.listen(port, console.log(`server is running on port ${port}`));

// mongoose.connect(uri, {

//         useNewUrlParser:true,
//         useUnifiedTopology:true,
//     }).then(()=> console.log("mongoDb connection succesfully..Hurry"))
//     .catch((err)=>console.log("mongodb connection is failed..",err.message));