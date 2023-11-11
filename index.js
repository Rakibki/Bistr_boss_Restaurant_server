const express = require('express')
const cors = require('cors')
const port = process.env.PORT || 4500;
const { MongoClient, ServerApiVersion } = require('mongodb');


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

    app.get("/menu", async(req, res) => {
      const result = await menuCollectopn.find().toArray();
      res.send(result)
    })

    app.get("/reviews", async(req, res) => {
      const result = await reviewsCollection.find().toArray();
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