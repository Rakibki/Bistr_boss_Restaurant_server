const express = require('express')
const cors = require('cors')
const port = process.env.PORT || 4500;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_key);
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

const mg = mailgun.client({
	username: 'api',
	key: process.env.BISTRO_BOSS_MAIN_GUN_API_KEY,
});

const app = express()

app.use(cors())
app.use(express.json())


app.get("/", (req, res) => {
    res.send("bistro boss server")
})

const uri = `mongodb+srv://DB_BISTRO_BOSS:AZNNAsUI9GZClBSc@cluster0.sinogwr.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const database = client.db("DB_bistro_boss");
    const menuCollectopn = database.collection("menuCollectopn");
    const reviewsCollection = database.collection("reviewsCollection");
    const cardCollection = database.collection("cardCollection");
    const usersCollection = database.collection("usersCollection");
    const paymentsCollection = database.collection("paymentsCollection");

    // payment
    app.post("/create-payment-intent", async (req, res) => {
      const {price} = req.body;
      const amount = parseInt(price * 100)

      console.log(amount);
      
        const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
    
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    

    // medelweres
    const verifyToken = (req, res, next) => {
      if(!req.headers.authorization){
        return res.status(401).send({message: "forbiden Access"})
      };
      const token = req.headers.authorization.split(" ")[1]
      jwt.verify(token,  process.env.JWT_SRECRET, function(err, decoded) {
        if(err) {
          return res.status(401).send({message: "forbiden Access"})
        }
        req.decoded = decoded
        next()
      });
    }

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      const isAdmin = user?.role === "admin";
      if(!isAdmin) {
        return res.status(403).send("forbidden Access")
      }
      next()
    }

    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
      const users =  await usersCollection.estimatedDocumentCount()
      const menus =  await menuCollectopn.estimatedDocumentCount()
      // pore korte hobe;
      const oders = await paymentsCollection.estimatedDocumentCount();
      const revenue = (await paymentsCollection.find().toArray()).reduce((acc, curr) => acc + curr.price ,0);
      res.send({users,menus, oders, revenue})
    })


    // **********Menu Related api start***********
    app.get("/menu", async(req, res) => {
      const result = await menuCollectopn.find().toArray();
      res.send(result)
    })
    // **********Menu Related api end***********
  

    // **********reviews Related api start***********
    app.get("/reviews", async(req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result)
    })
    // **********reviews Related api end***********


    // **********cards Related api start***********
    app.post("/cards", async (req, res) => {
      const data = req.body;
      const result = await cardCollection.insertOne(data)
      res.send(result)
    })

    app.get("/cards", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = {email: email}
      const result = await cardCollection.find(query).toArray();
      res.send(result)
    })

    app.delete("/cards/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cardCollection.deleteOne(query)
      res.send(result)
    })
     // **********cards Related api end***********



     // **********users Related api start***********
     app.post("/users", async (req, res) => {
      const user = req.body;
      const query = {email: user.email}
      const exxistingUser = await usersCollection.findOne(query)
      if(exxistingUser) {
        return res.send({message: "user already axists", insertedId: null})
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
     })

     app.get("/users", verifyToken, verifyAdmin, async(req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
     })

     app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await usersCollection.deleteOne(query)
      res.send(result)
     })
     // **********users Related api end***********


    //**********create a admit***************
      app.patch('/users/admin/:id', async (req, res) =>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: "admin"
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)
    } )

    // *********Api Related Api stsrt**************
    app.post('/jwt', (req, res) => {
      const userInfo = req.body;
      const token = jwt.sign(userInfo, process.env.JWT_SRECRET, {expiresIn: "1h"})
      res.send({token})
    })
    // *********Api Related Api end**************


    // cheek admin
    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if(email !== req.decoded.email) {
        return res.status(403).send({massege: "unauthorizes acceess"})
      }
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      let isAdmin = false;
      if(user) {
        isAdmin = user.role === 'admin'
      }
      res.send({isAdmin})
    })

    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await menuCollectopn.deleteOne(query)
      res.send(result)
    })

    app.get("/menu/:id", async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const result = await menuCollectopn.findOne(filter);
      res.send(result)
    })

    app.patch("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const menu = req.body;
      const filter = {_id: new ObjectId(id)}

      const updateDoc = {
        $set: {
          name: menu.name,
          category: menu.category,
          price: menu.Price,
          recipe: menu.RecipeDetails
        },
      };
      const result = await menuCollectopn.updateOne(filter, updateDoc);
      res.send(result)
    })

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const menu = req.body;
      const result = await menuCollectopn.insertOne(menu);
      res.send(result)
    })


    app.post("/payment", async (req, res)=>{
      const paymentData = req.body;
      const query = {_id: { $in: paymentData.cardIds.map((item) => new ObjectId(item) )}}
      const cardDeleteResult = await cardCollection.deleteMany(query)
      const paymentREsult = await paymentsCollection.insertOne(paymentData)
      res.send({paymentREsult, cardDeleteResult})

    mg.messages
	  .create(process.env.BISTRO_BOSS_MAIN_GUN_SENDING_DOIMINGS, {
		from: "Mailgun Sandbox <postmaster@sandboxeab625fcced54174b0eb7d3a6412cf71.mailgun.org>",
		to: ["rbepari404@gmail.com"],
		subject: "bistro boss oder confirm",
		text: "Testing some Mailgun awesomness!",
	})
	.then(msg => console.log(msg)) // logs response data
	.catch(err => console.log(err)); 

    })
 
    app.get("/paymentHistory/:email", async(req, res) => {
      const email = req.params.email;
      const filter = {email: email};
      const result = await paymentsCollection.find(filter).toArray();
      res.send(result)
    })


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`bistro boss server is running port: ${port}`);
})