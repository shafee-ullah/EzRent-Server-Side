const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Database connected
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.spelf9f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
     await client.connect();
    
    const  propertiesCollection = client.db("ezrent").collection("properties");
    const  bookinghotelCollection = client.db("ezrent").collection("bookingdata");

  //  get api 
   app.get("/properties",async(req,res) =>{
    const cursor =  await propertiesCollection.find().toArray();
     res.send(cursor)
   })
   //git api  limit 8 data  home page 
   app.get("/FeaturedProperties",async(req,res) =>{
    const cursor =  await propertiesCollection.find().sort({
rating:-1}).limit(8).toArray();
     res.send(cursor)
   })

   app.get('/FeaturepropertiesDitels/:id',async(req,res)=>{
    const id = req.params.id;
    const query ={_id: new ObjectId(id)}
    const result= await propertiesCollection.findOne(query)
    res.send(result)
})
  // booking data post 
  app.post("/bookinghotel", async (req, res) => {
  const newProperty = req.body;
  console.log(newProperty)
  const result = await bookinghotelCollection.insertOne(newProperty);
  res.send(result);
});
 

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is  running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
