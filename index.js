const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// stripe account
const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_KEY);

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
    // await client.connect();

    const propertiesCollection = client.db("ezrent").collection("properties");
    const bookinghotelCollection = client
      .db("ezrent")
      .collection("bookingdata");
    const usersCollection = client.db("ezrent").collection("users");
    const hostRequestCollection = client.db("ezrent").collection("hostRequest");
    const paymentsCollection = client.db("ezrent").collection("payments");

    // Register new user
    app.post("/users", async (req, res) => {
      try {
        const { name, email, role } = req.body;

        // Basic validation
        if (!name || !email || !role) {
          return res.status(400).send({ message: "All fields are required" });
        }

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
          return res.status(400).send({ message: "User already exists" });
        }

        // Insert new user
        const result = await usersCollection.insertOne({ name, email, role });
        res.status(201).send({
          message: "User registered successfully",
          userId: result.insertedId,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // get users
    app.get("/users", async (req, res) => {
      const user = await usersCollection.find().toArray();
      res.send(user);
    });

    // ✅ Recommended approach
    app.get("/api/users", async (req, res) => {
      const { email } = req.query;
      const user = await usersCollection.findOne({ email });
      if (!user) return res.status(404).send("User not found");
      res.json(user);
    });

    // Get single user by email
    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email });

        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send(user);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // host req post
    app.post("/hostRequest", async (req, res) => {
      const newHost = req.body;
      const result = await hostRequestCollection.insertOne(newHost);
      res.send(result);
    });

    // host req get
    app.get("/hostRequest", async (req, res) => {
      const allReq = await hostRequestCollection.find().toArray();
      res.send(allReq);
    });

     app.get("/properties", async (req, res) => {
      const  request = await propertiesCollection.find().toArray();
      res.send( request);
    });

    //  get api - support optional email query to filter properties by owner/host email
    // app.get("/properties", async (req, res) => {
    //   try {
    //     const { email } = req.query; // optional query param: /properties?email=someone@example.com
    //     const query = email ? { email } : {};
    //     const properties = await propertiesCollection.find(query).toArray();
    //     res.send(properties);
    //   } catch (error) {
    //     console.error("Error fetching properties:", error);
    //     res.status(500).json({ message: "Server error" });
    //   }
    //  });



    //git api  limit 8 data  home page
    app.get("/FeaturedProperties", async (req, res) => {
      const cursor = await propertiesCollection.find().limit(6).toArray();
      res.send(cursor);
    });

    app.get("/FeaturepropertiesDitels/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.findOne(query);
      res.send(result);
    });
    //  guest booking data get api
    app.get("/bookinghotel", async (req, res) => {
      const booking = await bookinghotelCollection.find().toArray();
      res.send(booking);
    })


    // get bookings data with email based 
    app.get("/myBookings", async (req, res) => {
      try {
        const { email } = req.query;
        const query = email ? { email } : {}; // filter if email provided
        const bookings = await bookinghotelCollection.find(query).toArray();
        res.send(bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Server error" });
      }
    });



    // booking data post
    app.post("/bookinghotel", async (req, res) => {
      const newProperty = req.body;
      // console.log(newProperty);
      const result = await bookinghotelCollection.insertOne(newProperty);
      res.send(result);
    });
    // ...existing code...

    // Delete booking by ID
    app.delete("/bookinghotel/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await bookinghotelCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Booking not found" });
        }

        res.json({ message: "Booking deleted successfully" });
      } catch (error) {
        res.status(500).json({ message: "Error deleting booking", error });
      }
    });

    // ...existing code...


    // host Add property
    app.post("/AddProperty", async (req, res) => {
      const AddProperty = req.body;
      // console.log(newProperty);
      const result = await propertiesCollection.insertOne(AddProperty);
      res.send(result);
    });



    // Update property by ID
    app.put("/AddProperty/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;

        const result = await propertiesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Property not found" });
        }

        res.json({ message: "Property updated successfully", result });
      } catch (error) {
        res.status(500).json({ message: "Error updating property", error });
      }
    });


    // ...existing code...

    // Delete property by ID
    app.delete("/properties/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await propertiesCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Property not found" });
        }

        res.json({ message: "Property deleted successfully" });
      } catch (error) {
        res.status(500).json({ message: "Error deleting property", error });
      }
    });

    // ...existing code...

    //  Update user role (host/guest)
    app.patch("/users/role/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { role } = req.body;

        if (!role) return res.status(400).send({ message: "Role is required" });

        const result = await hostRequestCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role } }
        );

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    //  Update user status (reject, active, etc.)
    app.patch("/users/status/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;

        if (!status)
          return res.status(400).send({ message: "Status is required" });

        const result = await hostRequestCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // ==================== PAYMENT ENDPOINTS ====================

    // Create Stripe Payment Intent
    app.post("/api/payment/create-payment-intent", async (req, res) => {
      try {
        const { amount, bookingId, userId } = req.body;

        // Validate required fields
        if (!amount || !bookingId || !userId) {
          return res.status(400).json({
            error: "Missing required fields: amount, bookingId, userId",
          });
        }

        // Validate amount (should be positive number in cents)
        const amountInCents = Math.round(amount * 100);
        if (amountInCents <= 0) {
          return res.status(400).json({
            error: "Amount must be greater than 0",
          });
        }

        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "usd",
          metadata: {
            bookingId: bookingId,
            userId: userId,
          },
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).json({
          error: "Failed to create payment intent",
          message: error.message,
        });
      }
    });

    // Confirm payment and store in database
    app.post("/api/payment/confirm", async (req, res) => {
      try {
        const {
          transactionId,
          amount,
          bookingId,
          userId,
          status,
          paymentMethod,
          currency = "usd",
        } = req.body;

        // Validate required fields
        if (!transactionId || !amount || !bookingId || !userId || !status) {
          return res.status(400).json({
            error:
              "Missing required fields: transactionId, amount, bookingId, userId, status",
          });
        }

        // Validate payment status
        if (!["succeeded", "failed", "canceled"].includes(status)) {
          return res.status(400).json({
            error: "Invalid payment status",
          });
        }

        // Create payment document
        const paymentData = {
          bookingId: bookingId,
          userId: userId,
          amount: parseFloat(amount),
          transactionId: transactionId,
          paymentStatus: status,
          paymentMethod: paymentMethod || "card",
          currency: currency,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Store payment in MongoDB
        const result = await paymentsCollection.insertOne(paymentData);

        if (result.acknowledged) {
          res.json({
            success: true,
            message: "Payment confirmed and stored successfully",
            paymentId: result.insertedId,
          });
        } else {
          throw new Error("Failed to store payment data");
        }
      } catch (error) {
        console.error("Error confirming payment:", error);
        res.status(500).json({
          error: "Failed to confirm payment",
          message: error.message,
        });
      }
    });

    // Get payment history for a user
    app.get("/api/payments/user/:userId", async (req, res) => {
      try {
        const userId = req.params.userId;

        const payments = await paymentsCollection
          .find({ userId: userId })
          .sort({ createdAt: -1 })
          .toArray();

        res.json(payments);
      } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({
          error: "Failed to fetch payments",
          message: error.message,
        });
      }
    });

    // Get payment by transaction ID
    app.get("/api/payments/transaction/:transactionId", async (req, res) => {
      try {
        const transactionId = req.params.transactionId;

        const payment = await paymentsCollection.findOne({
          transactionId: transactionId,
        });

        if (!payment) {
          return res.status(404).json({
            error: "Payment not found",
          });
        }

        res.json(payment);
      } catch (error) {
        console.error("Error fetching payment:", error);
        res.status(500).json({
          error: "Failed to fetch payment",
          message: error.message,
        });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
