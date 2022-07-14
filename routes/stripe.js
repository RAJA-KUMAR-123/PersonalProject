const express = require("express");
const Stripe = require("stripe");
const { Order } = require("../models/Order");
const bodyParser=require("body-parser");
const app=express();

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

require("dotenv").config();

const stripe = Stripe(process.env.STRIPE_KEY);

const router = express.Router();

router.post("/create-checkout-session", async (req, res) => {
  // const customer = await stripe.customers.create({
  //   metadata: {
  //     userId: req.body.userId,
  //     cart: JSON.stringify(req.body.cartItems),
  //   },
  // });
  const customer= {
    metadata:{
      userId: req.body.userId,
      cart: req.body.cartItems,
    }
  }
  console.log(JSON.parse(JSON.stringify(req.body.cartItems.cartItems)));
  //customer.metadata.cart.
  const line_items = customer.metadata.cart.cartItems.map(({name,id,image,desc,price,cartQuantity}) => {
    return {
      price_data: {
        currency: "usd",
        product_data: {
          name: name,
          images: [image],
          description: desc,
          metadata: {
            id: id,
          },
        },
        unit_amount: price * 100,
      },
      quantity: cartQuantity,
    };
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    shipping_address_collection: {
      allowed_countries: ["US", "CA", "KE"],
      // allowed_countries: ["IND"],
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: 0,
            currency: "usd",
          },
          display_name: "Free shipping",
          // Delivers between 5-7 business days
          delivery_estimate: {
            minimum: {
              unit: "business_day",
              value: 5,
            },
            maximum: {
              unit: "business_day",
              value: 7,
            },
          },
        },
      },
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: 1500,
            currency: "usd",
          },
          display_name: "Next day air",
          // Delivers in exactly 1 business day
          delivery_estimate: {
            minimum: {
              unit: "business_day",
              value: 1,
            },
            maximum: {
              unit: "business_day",
              value: 1,
            },
          },
        },
      },
    ],
    phone_number_collection: {
      enabled: true,
    },
    line_items,
    mode: "payment",
    customer: customer.id,
    success_url: `${process.env.CLIENT_URL}/checkout-success`,
    cancel_url: `${process.env.CLIENT_URL}/cart`,
  });

  // res.redirect(303, session.url);
  res.send({ url: session.url });
});

// Create order function

const createOrder = async (customer, data) => {
  const Items = JSON.parse(customer.metadata.cart);

  const products = Items.map((item) => {
    return {
      productId: item.id,
      quantity: item.cartQuantity,
    };
  });

  const newOrder = new Order({
    userId: customer.metadata.userId,
    customerId: data.customer,
    paymentIntentId: data.payment_intent,
    products,
    subtotal: data.amount_subtotal,
    total: data.amount_total,
    shipping: data.customer_details,
    payment_status: data.payment_status,
  });

  try {
    const savedOrder = await newOrder.save();
    console.log("Processed Order:", savedOrder);
  } catch (err) {
    console.log(err);
  }
};



// Stripe webhoook

router.post(
  "/webhook",
  express.json({ type: "application/json" }),
  async (req, res) => {
    let data;
    let eventType;

    // Check if webhook signing is configured.
    let webhookSecret;
    webhookSecret = process.env.STRIPE_WEB_HOOK;

    if (webhookSecret) {

      // Retrieve the event by verifying the signature using the raw body and secret.
      let event;
      let signature = req.headers["stripe-signature"];

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          webhookSecret
        );
      } catch (err) {
        console.log(`⚠️  Webhook signature verification failed:  ${err}`);
        return res.sendStatus(400);
      }
      // Extract the object from the event.
      data = event.data.object;
      eventType = event.type;
    } else {
      // Webhook signing is recommended, but if the secret is not configured in `config.js`,
      // retrieve the event data directly from the request body.
      data = req.body.data.object;
      eventType = req.body.type;
    }

    // Handle the checkout.session.completed event
    if (eventType === "checkout.session.completed") {
      stripe.customers
        .retrieve(data.customer)
        .then(async (customer) => {
          try {
            // CREATE ORDER
            createOrder(customer, data);
          } catch (err) {
            console.log(typeof createOrder);
            console.log(err);
          }
        })
        .catch((err) => console.log(err.message));
    }

    res.status(200).end();

  }
);

module.exports = router;





















////////////////////////////////////////////////////
// const express = require("express");
// const Stripe = require("stripe");
// const { Order } = require("../models/order");

// require("dotenv").config();

// const stripe = Stripe(process.env.STRIPE_KEY);

// const router = express.Router();

// router.post("/create-checkout-session", async (req, res) => {
//   const cartItems = JSON.stringify(req.body.cartItems);
//   const customer = await stripe.customers.create({
//     metadata: {
//       userId: req.body.userId,
//       cart : cartItems       // JSON.stringify(req.body.cartItems),
//     },
//   });

//   // const line_items = req.body.Items.map((item) => {       // cart.cartItems
//     const line_items= cartItems.map((item) => { 
//     return {
//       price_data: {
//         currency: "usd",
//         product_data: {
//           name: item.name,
//           images: [item.image],
//           description: item.desc,
//           metadata: {
//             id: item.id,
//           },
//         },
//         unit_amount: item.price ,
//       },
//       quantity: item.cartQuantity,
//     };
//   });

//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ["card"],
//     shipping_address_collection: {
//       allowed_countries: ["US", "CA", "KE"],
//     },
//     shipping_options: [
//       {
//         shipping_rate_data: {
//           type: "fixed_amount",
//           fixed_amount: {
//             amount: 0,
//             currency: "usd",
//           },
//           display_name: "Free shipping",
//           // Delivers between 5-7 business days
//           delivery_estimate: {
//             minimum: {
//               unit: "business_day",
//               value: 5,
//             },
//             maximum: {
//               unit: "business_day",
//               value: 7,
//             },
//           },
//         },
//       },
//       {
//         shipping_rate_data: {
//           type: "fixed_amount",
//           fixed_amount: {
//             amount: 1500,
//             currency: "usd",
//           },
//           display_name: "Next day air",
//           // Delivers in exactly 1 business day
//           delivery_estimate: {
//             minimum: {
//               unit: "business_day",
//               value: 1,
//             },
//             maximum: {
//               unit: "business_day",
//               value: 1,
//             },
//           },
//         },
//       },
//     ],
//     phone_number_collection: {
//       enabled: true,
//     },
//     line_items,
//     mode: "payment",
//     customer: customer.id,
//     success_url: `${process.env.CLIENT_URL}/checkout-success`,
//     cancel_url: `${process.env.CLIENT_URL}/cart`,
//   });

//   // res.redirect(303, session.url);
//   res.send({ url: session.url });
// });

// // Create order function

// const createOrder = async (customer, data) => {
//   const Items = JSON.parse(customer.metadata.cart);

//   const products = Items.map((item) => {
//     return {
//       productId: item.id,
//       quantity: item.cartQuantity,
//     };
//   });

//   const newOrder = new Order({
//     userId: customer.metadata.userId,
//     customerId: data.customer,
//     paymentIntentId: data.payment_intent,
//     products,
//     subtotal: data.amount_subtotal,
//     total: data.amount_total,
//     shipping: data.customer_details,
//     payment_status: data.payment_status,
//   });

//   try {
//     const savedOrder = await newOrder.save();
//     console.log("Processed Order:", savedOrder);
//   } catch (err) {
//     console.log(err);
//   }
// };

// // Stripe webhoook

// router.post(
//   "/webhook",
//   express.json({ type: "application/json" }),
//   async (req, res) => {
//     let data;
//     let eventType;

//     // Check if webhook signing is configured.
//     let webhookSecret;
//     //webhookSecret = process.env.STRIPE_WEB_HOOK;

//     if (webhookSecret) {
//       // Retrieve the event by verifying the signature using the raw body and secret.
//       let event;
//       let signature = req.headers["stripe-signature"];

//       try {
//         event = stripe.webhooks.constructEvent(
//           req.body,
//           signature,
//           webhookSecret
//         );
//       } catch (err) {
//         console.log(`⚠️  Webhook signature verification failed:  ${err}`);
//         return res.sendStatus(400);
//       }
//       // Extract the object from the event.
//       data = event.data.object;
//       eventType = event.type;
//     } else {
//       // Webhook signing is recommended, but if the secret is not configured in `config.js`,
//       // retrieve the event data directly from the request body.
//       data = req.body.data.object;
//       eventType = req.body.type;
//     }

//     // Handle the checkout.session.completed event
//     if (eventType === "checkout.session.completed") {
//       stripe.customers
//         .retrieve(data.customer)
//         .then(async (customer) => {
//           try {
//             // CREATE ORDER
//             createOrder(customer, data);
//           } catch (err) {
//             console.log(typeof createOrder);
//             console.log(err);
//           }
//         })
//         .catch((err) => console.log(err.message));
//     }

//     res.status(200).end();
//   }
// );

// module.exports = router;






























//////////////////////////////////////////////////////
// const express = require("express");
// const Stripe = require("stripe");
// const { Order } = require("../models/order");

// require("dotenv").config();

// const stripe = Stripe(process.env.STRIPE_KEY);

// const router = express.Router();

// router.post("/create-checkout-session", async (req, res) => {
//   const customer = await stripe.customers.create({
//     metadata: {
//       userId: req.body.userId,
//       cart: JSON.stringify(req.body.cartItems),
//     },
//   });

//   const line_items =cartItems && cartItems.map(item=>{
//  // const line_items = req.body.cartItems.map((item) => {
//     return {
//       price_data: {
//         currency: "usd",
//         product_data: {
//           name: item.name,
//           images: [item.image],
//           description: item.desc,
//           metadata: {
//             id: item.id,
//           },
//         },
//         unit_amount: item.price * 100,
//       },
//       quantity: item.cartQuantity,
//     };
//   });

//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ["card"],
//     shipping_address_collection: {
//       allowed_countries: ["US", "CA", "KE"],
//     },
//     shipping_options: [
//       {
//         shipping_rate_data: {
//           type: "fixed_amount",
//           fixed_amount: {
//             amount: 0,
//             currency: "usd",
//           },
//           display_name: "Free shipping",
//           // Delivers between 5-7 business days
//           delivery_estimate: {
//             minimum: {
//               unit: "business_day",
//               value: 5,
//             },
//             maximum: {
//               unit: "business_day",
//               value: 7,
//             },
//           },
//         },
//       },
//       {
//         shipping_rate_data: {
//           type: "fixed_amount",
//           fixed_amount: {
//             amount: 1500,
//             currency: "usd",
//           },
//           display_name: "Next day air",
//           // Delivers in exactly 1 business day
//           delivery_estimate: {
//             minimum: {
//               unit: "business_day",
//               value: 1,
//             },
//             maximum: {
//               unit: "business_day",
//               value: 1,
//             },
//           },
//         },
//       },
//     ],
//     phone_number_collection: {
//       enabled: true,
//     },
//     line_items,
//     mode: "payment",
//     customer: customer.id,
//     success_url: `${process.env.CLIENT_URL}/checkout-success`,
//     cancel_url: `${process.env.CLIENT_URL}/cart`,
//   });

//   // res.redirect(303, session.url);
//   res.send({ url: session.url });
// });

// // Create order function

// const createOrder = async (customer, data) => {
//   const Items = JSON.parse(customer.metadata.cart);

//   const products = Items.map((item) => {
//     return {
//       productId: item.id,
//       quantity: item.cartQuantity,
//     };
//   });

//   const newOrder = new Order({
//     userId: customer.metadata.userId,
//     customerId: data.customer,
//     paymentIntentId: data.payment_intent,
//     products,
//     subtotal: data.amount_subtotal,
//     total: data.amount_total,
//     shipping: data.customer_details,
//     payment_status: data.payment_status,
//   });

//   try {
//     const savedOrder = await newOrder.save();
//     console.log("Processed Order:", savedOrder);
//   } catch (err) {
//     console.log(err);
//   }
// };

// // Stripe webhoook

// router.post(
//   "/webhook",
//   express.json({ type: "application/json" }),
//   async (req, res) => {
//     let data;
//     let eventType;

//     // Check if webhook signing is configured.
//     let webhookSecret;
//     //webhookSecret = process.env.STRIPE_WEB_HOOK;

//     if (webhookSecret) {
//       // Retrieve the event by verifying the signature using the raw body and secret.
//       let event;
//       let signature = req.headers["stripe-signature"];

//       try {
//         event = stripe.webhooks.constructEvent(
//           req.body,
//           signature,
//           webhookSecret
//         );
//       } catch (err) {
//         console.log(`⚠️  Webhook signature verification failed:  ${err}`);
//         return res.sendStatus(400);
//       }
//       // Extract the object from the event.
//       data = event.data.object;
//       eventType = event.type;
//     } else {
//       // Webhook signing is recommended, but if the secret is not configured in `config.js`,
//       // retrieve the event data directly from the request body.
//       data = req.body.data.object;
//       eventType = req.body.type;
//     }

//     // Handle the checkout.session.completed event
//     if (eventType === "checkout.session.completed") {
//       stripe.customers
//         .retrieve(data.customer)
//         .then(async (customer) => {
//           try {
//             // CREATE ORDER
//             createOrder(customer, data);
//           } catch (err) {
//             console.log(typeof createOrder);
//             console.log(err);
//           }
//         })
//         .catch((err) => console.log(err.message));
//     }

//     res.status(200).end();
//   }
// );

// module.exports = router;

/////////////////////////////////////////////////////
// router.post("/create-checkout-session", async (req, res) => {
//   const customer = await stripe.customers.create({
//     metadata: {
//       userId: req.body.userId,
//       cart: JSON.stringify(req.body.cartItems),
//     },
//   });

//   const line_items = req.body.cartItems && req.body.cartItems.map((item)=>{
//     return {
//       price_data: {
//         currency: "usd",
//         product_data: {
//           name: item.name,
//           images: [item.image],
//           description: item.desc,
//           metadata: {
//             id: item.id,
//           },
//         },
//         unit_amount: item.price * 100,
//       },
//       quantity: item.cartQuantity,
//     };
//   });

//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ["card"],
//     shipping_address_collection: {
//       allowed_countries: ["US", "CA", "KE"],
//     },
//     shipping_options: [
//       {
//         shipping_rate_data: {
//           type: "fixed_amount",
//           fixed_amount: {
//             amount: 0,
//             currency: "usd",
//           },
//           display_name: "Free shipping",
//           // Delivers between 5-7 business days
//           delivery_estimate: {
//             minimum: {
//               unit: "business_day",
//               value: 5,
//             },
//             maximum: {
//               unit: "business_day",
//               value: 7,
//             },
//           },
//         },
//       },
//       {
//         shipping_rate_data: {
//           type: "fixed_amount",
//           fixed_amount: {
//             amount: 1500,
//             currency: "usd",
//           },
//           display_name: "Next day air",
//           // Delivers in exactly 1 business day
//           delivery_estimate: {
//             minimum: {
//               unit: "business_day",
//               value: 1,
//             },
//             maximum: {
//               unit: "business_day",
//               value: 1,
//             },
//           },
//         },
//       },
//     ],
//     phone_number_collection: {
//       enabled: true,
//     },
//     line_items,
//     mode: "payment",
//     customer: customer.id,
//     success_url: `${process.env.CLIENT_URL}/checkout-success`,
//     cancel_url: `${process.env.CLIENT_URL}/cart`,
//   });

//   // res.redirect(303, session.url);
//   res.send({ url: session.url });
// });

// // Create order function

// const createOrder = async (customer, data) => {
//   const Items = JSON.parse(customer.metadata.cart);

//   const products = Items && Items.map((item) => {
//     return {
//       productId: item.id,
//       quantity: item.cartQuantity,
//     };
//   });

//   const newOrder = new Order({
//     userId: customer.metadata.userId,
//     customerId: data.customer,
//     paymentIntentId: data.payment_intent,
//     products,
//     subtotal: data.amount_subtotal,
//     total: data.amount_total,
//     shipping: data.customer_details,
//     payment_status: data.payment_status,
//   });

//   try {
//     const savedOrder = await newOrder.save();
//     console.log("Processed Order:", savedOrder);
//   } catch (err) {
//     console.log(err);
//   }
// };

// // Stripe webhoook

// router.post(
//   "/webhook",
//   express.json({ type: "application/json" }),
//   async (req, res) => {
//     let data;
//     let eventType;

//     // Check if webhook signing is configured.
//     let webhookSecret;
//     //webhookSecret = process.env.STRIPE_WEB_HOOK;

//     if (webhookSecret) {
//       // Retrieve the event by verifying the signature using the raw body and secret.
//       let event;
//       let signature = req.headers["stripe-signature"];

//       try {
//         event = stripe.webhooks.constructEvent(
//           req.body,
//           signature,
//           webhookSecret
//         );
//       } catch (err) {
//         console.log(`⚠️  Webhook signature verification failed:  ${err}`);
//         return res.sendStatus(400);
//       }
//       // Extract the object from the event.
//       data = event.data.object;
//       eventType = event.type;
//     } else {
//       // Webhook signing is recommended, but if the secret is not configured in `config.js`,
//       // retrieve the event data directly from the request body.
//       data = req.body.data.object;
//       eventType = req.body.type;
//     }

//     // Handle the checkout.session.completed event
//     if (eventType === "checkout.session.completed") {
//       stripe.customers
//         .retrieve(data.customer)
//         .then(async (customer) => {
//           try {
//             // CREATE ORDER
//             createOrder(customer, data);
//           } catch (err) {
//             console.log(typeof createOrder);
//             console.log(err);
//           }
//         })
//         .catch((err) => console.log(err.message));
//     }

//     res.status(200).end();
//   }
// );

// module.exports = router;
//************************************************* */
// const express = require("express");
// const Stripe = require("stripe");
// const { Order } = require("../models/order");


// require("dotenv").config();

// const stripe = Stripe(process.env.STRIPE_KEY);

// const router = express.Router();

// router.post("/create-checkout-session", async (req, res) => {
//   const customer = await stripe.customers.create({
//     metadata: {
//       userId: req.body.userId,
//       cart: JSON.stringify(req.body.cartItems),
//     },
//   });

//   const line_items = req.body.cartItems.map((item) => {
//     return {
//       price_data: {
//         currency: "usd",
//         product_data: {
//           name: item.name,
//           images: [item.image],
//           description: item.desc,
//           metadata: {
//             id: item.id,
//           },
//         },
//         unit_amount: item.price * 100,
//       },
//       quantity: item.cartQuantity,
//     };
//   });

//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ["card"],
//     shipping_address_collection: {
//       allowed_countries: ["US", "CA", "KE"],
//     },
//     shipping_options: [
//       {
//         shipping_rate_data: {
//           type: "fixed_amount",
//           fixed_amount: {
//             amount: 0,
//             currency: "usd",
//           },
//           display_name: "Free shipping",
//           // Delivers between 5-7 business days
//           delivery_estimate: {
//             minimum: {
//               unit: "business_day",
//               value: 5,
//             },
//             maximum: {
//               unit: "business_day",
//               value: 7,
//             },
//           },
//         },
//       },
//       {
//         shipping_rate_data: {
//           type: "fixed_amount",
//           fixed_amount: {
//             amount: 1500,
//             currency: "usd",
//           },
//           display_name: "Next day air",
//           // Delivers in exactly 1 business day
//           delivery_estimate: {
//             minimum: {
//               unit: "business_day",
//               value: 1,
//             },
//             maximum: {
//               unit: "business_day",
//               value: 1,
//             },
//           },
//         },
//       },
//     ],
//     phone_number_collection: {
//       enabled: true,
//     },
//     line_items,
//     mode: "payment",
//     customer: customer.id,
//     success_url: `${process.env.CLIENT_URL}/checkout-success`,
//     cancel_url: `${process.env.CLIENT_URL}/cart`,
//   });

//   // res.redirect(303, session.url);
//   res.send({ url: session.url });
// });

// // Create order function

// const createOrder = async (customer, data) => {
//   const Items = JSON.parse(customer.metadata.cart);

//   const products = Items.map((item) => {
//     return {
//       productId: item.id,
//       quantity: item.cartQuantity,
//     };
//   });

//   const newOrder = new Order({
//     userId: customer.metadata.userId,
//     customerId: data.customer,
//     paymentIntentId: data.payment_intent,
//     products,
//     subtotal: data.amount_subtotal,
//     total: data.amount_total,
//     shipping: data.customer_details,
//     payment_status: data.payment_status,
//   });

//   try {
//     const savedOrder = await newOrder.save();
//     console.log("Processed Order:", savedOrder);
//   } catch (err) {
//     console.log(err);
//   }
// };

// // Stripe webhoook

// router.post(
//   "/webhook",
//   express.json({ type: "application/json" }),
//   async (req, res) => {
//     let data;
//     let eventType;

//     // Check if webhook signing is configured.
//     let webhookSecret;
//     //webhookSecret = process.env.STRIPE_WEB_HOOK;

//     if (webhookSecret) {
//       // Retrieve the event by verifying the signature using the raw body and secret.
//       let event;
//       let signature = req.headers["stripe-signature"];

//       try {
//         event = stripe.webhooks.constructEvent(
//           req.body,
//           signature,
//           webhookSecret
//         );
//       } catch (err) {
//         console.log(`⚠️  Webhook signature verification failed:  ${err}`);
//         return res.sendStatus(400);
//       }
//       // Extract the object from the event.
//       data = event.data.object;
//       eventType = event.type;
//     } else {
//       // Webhook signing is recommended, but if the secret is not configured in `config.js`,
//       // retrieve the event data directly from the request body.
//       data = req.body.data.object;
//       eventType = req.body.type;
//     }

//     // Handle the checkout.session.completed event
//     if (eventType === "checkout.session.completed") {
//       stripe.customers
//         .retrieve(data.customer)
//         .then(async (customer) => {
//           try {
//             // CREATE ORDER
//             createOrder(customer, data);
//           } catch (err) {
//             console.log(typeof createOrder);
//             console.log(err);
//           }
//         })
//         .catch((err) => console.log(err.message));
//     }

//     res.status(200).end();
//   }
// );

// module.exports = router;



// ********************************************** */


// const express = require("express");
// const Stripe = require("stripe");
// const { Order } = require("../models/order");

// require("dotenv").config();

// const stripe = Stripe(process.env.STRIPE_KEY);

// const router = express.Router();

// router.post("/create-checkout-session", async (req, res) => {
  // const customer = await stripe.customers.create({
  //   metadata: {
  //     userId: req.body.userId,
  //     cart: JSON.stringify(req.body.cartItems),
  //   },
  // });

//   const line_items = req.body.cartItems.map((item) => {
//     return {
//       price_data: {
//         currency: "usd",
//         product_data: {
//           name: item.name,
//           images: [item.image],
//           description: item.desc,
//           metadata: {
//             id: item.id,
//           },
//         },
//         unit_amount: item.price * 100,
//       },
//       quantity: item.cartQuantity,
//     };
//   });

//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ["card"],
//     shipping_address_collection: {
//       allowed_countries: ["US", "CA", "KE"],
//     },
//     shipping_options: [
//       {
//         shipping_rate_data: {
//           type: "fixed_amount",
//           fixed_amount: {
//             amount: 0,
//             currency: "usd",
//           },
//           display_name: "Free shipping",
//           // Delivers between 5-7 business days
//           delivery_estimate: {
//             minimum: {
//               unit: "business_day",
//               value: 5,
//             },
//             maximum: {
//               unit: "business_day",
//               value: 7,
//             },
//           },
//         },
//       },
//       {
//         shipping_rate_data: {
//           type: "fixed_amount",
//           fixed_amount: {
//             amount: 1500,
//             currency: "usd",
//           },
//           display_name: "Next day air",
//           // Delivers in exactly 1 business day
//           delivery_estimate: {
//             minimum: {
//               unit: "business_day",
//               value: 1,
//             },
//             maximum: {
//               unit: "business_day",
//               value: 1,
//             },
//           },
//         },
//       },
//     ],
//     line_items,
//     phone_number_collection: {
//       enabled: true,
//     },

//     mode: "payment",
//     customer: customer.id,
//     success_url: `${process.env.CLIENT_URL}/checkout-success`,
//     cancel_url: `${process.env.CLIENT_URL}/cart`,
//   });

//   // res.redirect(303, session.url);
//   res.send({ url: session.url });
// });

// // Create order function

// const createOrder = async (customer, data) => {
//   const Items = JSON.parse(customer.metadata.cart);

//   const products = Items.map((item) => {
//     return {
//       productId: item.id,
//       quantity: item.cartQuantity,
//     };
//   });

//   const newOrder = new Order({
//     userId: customer.metadata.userId,
//     customerId: data.customer,
//     paymentIntentId: data.payment_intent,
//     products,
//     subtotal: data.amount_subtotal,
//     total: data.amount_total,
//     shipping: data.customer_details,
//     payment_status: data.payment_status,
//   });

//   try {
//     const savedOrder = await newOrder.save();
//     console.log("Processed Order:", savedOrder);
//   } catch (err) {
//     console.log(err);
//   }
// };

// // Stripe webhoook

// router.post(
//   "/webhook",
//   express.json({ type: "application/json" }),
//   async (req, res) => {
//     let data;
//     let eventType;

//     // Check if webhook signing is configured.
//     let webhookSecret;
//     //webhookSecret = process.env.STRIPE_WEB_HOOK;

//     if (webhookSecret) {
//       // Retrieve the event by verifying the signature using the raw body and secret.
//       let event;
//       let signature = req.headers["stripe-signature"];

//       try {
//         event = stripe.webhooks.constructEvent(
//           req.body,
//           signature,
//           webhookSecret
//         );
//       } catch (err) {
//         console.log(`⚠️  Webhook signature verification failed:  ${err}`);
//         return res.sendStatus(400);
//       }
//       // Extract the object from the event.
//       data = event.data.object;
//       eventType = event.type;
//     } else {
//       // Webhook signing is recommended, but if the secret is not configured in `config.js`,
//       // retrieve the event data directly from the request body.
//       data = req.body.data.object;
//       eventType = req.body.type;
//     }

//     // Handle the checkout.session.completed event
//     if (eventType === "checkout.session.completed") {
//       stripe.customers
//         .retrieve(data.customer)
//         .then(async (customer) => {
//           try {
//             // CREATE ORDER
//             createOrder(customer, data);
//           } catch (err) {
//             console.log(typeof createOrder);
//             console.log(err);
//           }
//         })
//         .catch((err) => console.log(err.message));
//     }

//     res.status(200).end();
//   }
// );

// module.exports = router;









// function line_items(props) {
//   const req.body.cartItems = props.req.body.cartItems;
//   return (
//     <>
//       {req.body.cartItems.map((item) =>
//         <ListItem key={req.body.cartItems.toString()}
//                   value={req.body.cartItems} />
//       )}
//     </>
//   );

//       }

//       function NumberList(props) {
//         const numbers = props.numbers;
//         return (
//           <ul>
//             {numbers.map((item) =>
//               <ListItem key={number.toString()}
//                         value={number} />
//             )}
//           </ul>
//         );
//       }

// const express = require("express");
// const Stripe = require("stripe");


// require("dotenv").config();
// const stripe = Stripe(process.env.STRIPE_KEY)
// const router = express.Router();

// router.post("/create-checkout-session", async (req, res) => {
//  const line_items = req.body.cartItems.map(item=>{
//     return {
//          price_data:{
//              currency:'INR',
//              product_data:{
//                  name:item.name,
//                  image:[item.image],
//                  disc: item.disc,
//                  metadata:{
//                   id:item.id
//                  }
//              },
//              unit_amount: item.price,
//          },
//          quantity:item.cartQuantity,
//     }
//   })


//     const session = await stripe.checkout.sessions.create({

// // router.post("/create-checkout-session", async (req, res) =>{

// //     const session = await stripe.checkout.sessions.create({
 
//     line_items,
//     data,
//         mode: "payment",
//         success_url :`${process.env.CLIENT_URL}/checkout-success`,
//         cancel_url: `${process.env.CLIENT_URL}/cart`,
//     });
//     res.send({url:session.url });
// });

// module.exports= router;


