const bcrypt = require("bcrypt");
const { User } = require("../models/user");
const Joi = require("joi");
const express = require("express");
const generateAuthToken = require("../utils/AuthToken");
const router = express.Router();

router.post("/", async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().min(5).max(20).required(),
    email: Joi.string().min(8).max(150).required().email(),
    password: Joi.string().min(4).max(150).required(),
  });

  const { error } = schema.validate(req.body);

  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ email: req.body.email });
  if (user) return res.status(400).send("User already exists...");



  const { name, email, password } = req.body;

  user = new User({ name, email, password });

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);

  await user.save();

  const token = generateAuthToken(user);

  res.send(token);
});

module.exports = router;


// const bcrypt = require("bcrypt");
// const Joi = require("joi");

// const express = require("express");
// const { User } = require("../models/user");
// const router = express.Router()

// router.post("/",async(req,res)=>{
//     const schema = Joi.object({
//         name: Joi.string().min(3).max(20).required(),
//         email: Joi.string().min(10).max(150).required().email(),
//         password: Joi.string().min(4).max(150).required(),
//         // confirmPassword: Joi.string().min(10).max(150).required(),

//     });
//     const {error}=schema.validate(req.body)

//     if(error) {
//         return res.status(400).send(error.details[0].message);
//     }

//     const user = await User.findOne({email: req.body.email});

//     if(user)
//     {
//         return res.status(400).send("Sorry! User already exits......");
//     }
    
//    user = new User({
//         name: req.body.name,
//         email: req.body.email,
//         password: req.body.password,
//         // confirmPassword: req.body.confirmPassword,

//     });

//     const salt = await bcrypt.genSalt(15)

//     user.password = await bcrypt.hash(user.password,salt);     // ,user.confirmPassword,salt

//     // const salt1 = await bcrypt.genSalt(15)

//     // user.confirmPassword = await bcrypt.hash(user.confirmPassword,salt); 

//     user = await user.save();

//     const token = genAuthToken (user)

//     res.send(token);
// })

// module.exports = router;