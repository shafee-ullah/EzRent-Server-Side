const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { Server } = require("socket.io");
const http = require("http");
const experienceRoutes = require("./routes/experienceRoutes");
const { send } = require("process");

const app = express();
const port = process.env.PORT || 5000;

// Request Logger Middleware
const requestLogger = (req, res, next) => {
  // console.log("\n=== Request Details ===");
  // console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  // console.log("Headers:", req.headers);
  // console.log("Query:", req.query);
  // console.log("Body:", req.body);
  // console.log("========================\n");
  next();
};

// Middleware Setup
app.use(requestLogger);
app.use(
  cors({
    origin: "*",
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // ← Added PATCH
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: false,
  })
);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO - optimized for Railway
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: false,
  },
  transports: ['websocket', 'polling'], // WebSocket first on Railway
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(express.json());
app.use("/api/experiences", experienceRoutes);
app.use("/uploads", express.static("uploads"));




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
    const wishListCollection = client.db("ezrent").collection("wishList");
    // Experiences collection
    const experiencesCollection = client.db("ezrent").collection("experiences");

    // Chat collections
    const conversationsCollection = client
      .db("ezrent")
      .collection("conversations");
    const messagesCollection = client.db("ezrent").collection("messages");
    const reviewCollection = client.db("ezrent").collection("reviews")


    // ==================== SOCKET.IO SETUP ====================

    // Store online users
    const onlineUsers = new Map();

    io.on("connection", (socket) => {
      // console.log("User connected:", socket.id);

      // User joins with their user ID
      socket.on("join", (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        // console.log(`User ${userId} joined with socket ${socket.id}`);

        // Notify others that user is online
        socket.broadcast.emit("user-online", userId);
      });

      // Join a conversation room
      socket.on("join-conversation", (conversationId) => {
        socket.join(conversationId);
        // console.log(
        //   `User ${socket.userId} joined conversation ${conversationId}`
        // );
      });

      // Leave a conversation room
      socket.on("leave-conversation", (conversationId) => {
        socket.leave(conversationId);
        // console.log(
        //   `User ${socket.userId} left conversation ${conversationId}`
        // );
      });

      // Handle new message
      // socket.on("send-message", async (data) => {
      //   try {
      //     const {
      //       conversationId,
      //       senderId,
      //       message,
      //       messageType = "text",
      //     } = data;

      //     // Get conversation to find both users
      //     const conversation = await conversationsCollection.findOne({
      //       _id: new ObjectId(conversationId)
      //     });

      //     if (!conversation) {
      //       socket.emit("message-error", { error: "Conversation not found" });
      //       return;
      //     }

      //     // Determine receiver ID
      //     const receiverId = senderId === conversation.guestId.toString()
      //       ? conversation.hostId.toString()
      //       : conversation.guestId.toString();

      //     // Save message to database
      //     const newMessage = {
      //       conversationId: new ObjectId(conversationId),
      //       senderId: new ObjectId(senderId),
      //       receiverId: receiverId,
      //       message,
      //       messageType,
      //       timestamp: new Date(),
      //       read: false,
      //     };

      //     const result = await messagesCollection.insertOne(newMessage);
      //     newMessage._id = result.insertedId;

      //     // Update conversation last message
      //     await conversationsCollection.updateOne(
      //       { _id: new ObjectId(conversationId) },
      //       {
      //         $set: {
      //           lastMessage: message,
      //           lastMessageTime: new Date(),
      //           lastMessageSender: new ObjectId(senderId),
      //         },
      //       }
      //     );

      //     // Emit message to all users in the conversation room
      //     io.to(conversationId).emit("new-message", {
      //       ...newMessage,
      //       conversationId: conversationId,
      //       senderId: senderId,
      //       receiverId: receiverId
      //     });

      //     // Also send directly to receiver's socket if they're online
      //     const receiverSocketId = onlineUsers.get(receiverId);
      //     if (receiverSocketId) {
      //       io.to(receiverSocketId).emit("new-message", {
      //         ...newMessage,
      //         conversationId: conversationId,
      //         senderId: senderId,
      //         receiverId: receiverId
      //       });
      //     }
      //   } catch (error) {
      //     console.error("Error sending message:", error);
      //     socket.emit("message-error", { error: "Failed to send message" });
      //   }
      // });

      // Handle new message
      // socket.on("send-message", async (data) => {
      //   try {
      //     const {
      //       conversationId,
      //       senderId,
      //       message,
      //       messageType = "text",
      //     } = data;

      //     // Get conversation to find both users
      //     const conversation = await conversationsCollection.findOne({
      //       _id: new ObjectId(conversationId)
      //     });

      //     if (!conversation) {
      //       socket.emit("message-error", { error: "Conversation not found" });
      //       return;
      //     }

      //     // ✅ FIX: Keep receiverId as ObjectId
      //     const senderObjectId = new ObjectId(senderId);
      //     const receiverId = senderObjectId.equals(conversation.guestId)
      //       ? conversation.hostId
      //       : conversation.guestId;

      //     // ✅ FIX: Store receiverId as ObjectId
      //     const newMessage = {
      //       conversationId: new ObjectId(conversationId),
      //       senderId: senderObjectId,
      //       receiverId: receiverId,  // Now stores ObjectId correctly
      //       message,
      //       messageType,
      //       timestamp: new Date(),
      //       read: false,
      //     };

      //     const result = await messagesCollection.insertOne(newMessage);
      //     newMessage._id = result.insertedId;

      //     // Update conversation last message
      //     await conversationsCollection.updateOne(
      //       { _id: new ObjectId(conversationId) },
      //       {
      //         $set: {
      //           lastMessage: message,
      //           lastMessageTime: new Date(),
      //           lastMessageSender: senderObjectId,
      //           updatedAt: new Date(),
      //         },
      //       }
      //     );

      //     // ✅ FIX: Convert to strings only for Socket.io emit
      //     const messageForEmit = {
      //       ...newMessage,
      //       conversationId: conversationId,
      //       senderId: senderId,
      //       receiverId: receiverId.toString(),
      //       _id: newMessage._id.toString(),
      //     };

      //     // Emit message to all users in the conversation room
      //     io.to(conversationId).emit("new-message", messageForEmit);

      //     // ✅ FIX: Use string version for socket lookup
      //     const receiverSocketId = onlineUsers.get(receiverId.toString());
      //     if (receiverSocketId) {
      //       io.to(receiverSocketId).emit("new-message", messageForEmit);
      //     }

      //   } catch (error) {
      //     console.error("Error sending message:", error);
      //     socket.emit("message-error", { error: "Failed to send message" });
      //   }
      // });

      socket.on("send-message", async (data) => {
        try {
          const {
            conversationId,
            senderId,
            message,
            messageType = "text",
          } = data;

          const conversation = await conversationsCollection.findOne({
            _id: new ObjectId(conversationId),
          });

          if (!conversation) {
            socket.emit("message-error", { error: "Conversation not found" });
            return;
          }

          // 🔍 ADD THESE LOGS
          // console.log("=== DEBUG MESSAGE SENDING ===");
          // console.log("senderId from frontend:", senderId, typeof senderId);
          // console.log("conversation.guestId:", conversation.guestId, typeof conversation.guestId);
          // console.log("conversation.hostId:", conversation.hostId, typeof conversation.hostId);

          const senderObjectId = new ObjectId(senderId);
          const receiverId = senderObjectId.equals(conversation.guestId)
            ? conversation.hostId
            : conversation.guestId;

          // console.log("Determined receiverId:", receiverId, typeof receiverId);
          // console.log("receiverId constructor:", receiverId.constructor.name);
          // console.log("=== END DEBUG ===");

          const newMessage = {
            conversationId: new ObjectId(conversationId),
            senderId: senderObjectId,
            receiverId: new ObjectId(receiverId),
            message,
            messageType,
            timestamp: new Date(),
            read: false,
          };

          const result = await messagesCollection.insertOne(newMessage);
          console.log("Inserted message:", result.insertedId);

          // Update conversation last message
          await conversationsCollection.updateOne(
            { _id: new ObjectId(conversationId) },
            {
              $set: {
                lastMessage: message,
                lastMessageTime: new Date(),
                lastMessageSender: new ObjectId(senderId),
              },
            }
          );

          // Emit message to all users in the conversation room
          io.to(conversationId).emit("new-message", {
            ...newMessage,
            conversationId: conversationId,
            senderId: senderId,
            receiverId: receiverId,
          });
          console.log(
            "Stored message receiverId:",
            storedMessage.receiverId,
            typeof storedMessage.receiverId
          );

          // Also send directly to receiver's socket if they're online
          const receiverSocketId = onlineUsers.get(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("new-message", {
              ...newMessage,
              conversationId: conversationId,
              senderId: senderId,
              receiverId: receiverId,
            });
          }
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("message-error", { error: "Failed to send message" });
        }
      });

      // Handle typing indicators
      socket.on("typing-start", (data) => {
        socket.to(data.conversationId).emit("user-typing", {
          userId: socket.userId,
          conversationId: data.conversationId,
          isTyping: true,
        });
      });

      socket.on("typing-stop", (data) => {
        socket.to(data.conversationId).emit("user-typing", {
          userId: socket.userId,
          conversationId: data.conversationId,
          isTyping: false,
        });
      });

      // Handle message read status
      socket.on("mark-messages-read", async (data) => {
        try {
          const { conversationId, userId } = data;

          await messagesCollection.updateMany(
            {
              conversationId: new ObjectId(conversationId),
              senderId: { $ne: new ObjectId(userId) },
              read: false,
            },
            { $set: { read: true, readAt: new Date() } }
          );

          // Notify sender that messages were read
          socket.to(conversationId).emit("messages-read", {
            conversationId,
            readBy: userId,
          });
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        if (socket.userId) {
          onlineUsers.delete(socket.userId);
          // console.log(`User ${socket.userId} disconnected`);

          // Notify others that user is offline
          socket.broadcast.emit("user-offline", socket.userId);
        }
      });
    });

    // ==================== CHAT API ROUTES ====================

    // Create a new conversation
    app.post("/api/conversations", async (req, res) => {
      try {
        const { guestId, hostId, propertyId, propertyTitle } = req.body;

        if (!guestId || !hostId) {
          return res
            .status(400)
            .json({ message: "Guest ID and Host ID are required" });
        }

        // Find users by email if guestId or hostId are emails
        let guestObjectId = guestId;
        let hostObjectId = hostId;

        // Check if guestId is an email
        if (guestId && typeof guestId === "string" && guestId.includes("@")) {
          const guestUser = await usersCollection.findOne({ email: guestId });
          if (guestUser) {
            guestObjectId = guestUser._id;
          } else {
            return res.status(404).json({ message: "Guest user not found" });
          }
        } else if (guestId && typeof guestId === "string") {
          try {
            guestObjectId = new ObjectId(guestId);
          } catch (error) {
            return res.status(400).json({ message: "Invalid guest ID format" });
          }
        }

        // Check if hostId is an email
        if (hostId && typeof hostId === "string" && hostId.includes("@")) {
          const hostUser = await usersCollection.findOne({ email: hostId });
          if (hostUser) {
            hostObjectId = hostUser._id;
            // console.log(hostObjectId);
          } else {
            return res.status(404).json({ message: "Host user not found" });
          }
        } else if (hostId && typeof hostId === "string") {
          try {
            hostObjectId = new ObjectId(hostId);
          } catch (error) {
            return res.status(400).json({ message: "Invalid host ID format" });
          }
        }

        // Check if conversation already exists
        const existingConversation = await conversationsCollection.findOne({
          $or: [
            { guestId: guestObjectId, hostId: hostObjectId },
            { guestId: hostObjectId, hostId: guestObjectId },
          ],
        });

        if (existingConversation) {
          return res.json(existingConversation);
        }

        // Create new conversation
        const newConversation = {
          guestId: guestObjectId,
          hostId: hostObjectId,
          propertyId: propertyId
            ? propertyId !== hostId
              ? new ObjectId(propertyId)
              : null
            : null,
          propertyTitle: propertyTitle || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastMessage: null,
          lastMessageTime: null,
          lastMessageSender: null,
        };

        // Log the conversation data for debugging
        console.log("Creating new conversation:", {
          guestId: guestObjectId.toString(),
          hostId: hostObjectId.toString(),
          propertyId: newConversation.propertyId
            ? newConversation.propertyId.toString()
            : null,
          propertyTitle: propertyTitle,
        });

        const result = await conversationsCollection.insertOne(newConversation);
        newConversation._id = result.insertedId;

        // Notify host about new conversation via socket
        // Use hostObjectId to ensure we look up by user ID, not email
        const hostSocketId = onlineUsers.get(hostObjectId.toString());
        if (hostSocketId) {
          io.to(hostSocketId).emit("new-conversation", newConversation);
        }

        res.status(201).json(newConversation);
      } catch (error) {
        console.error("Error creating conversation:", error);
        res.status(500).json({
          message: "Failed to create conversation",
          error: error.message,
        });
      }
    });

    // Get all conversations for a user
    app.get("/api/conversations/:userId", async (req, res) => {
      try {
        const userId = req.params.userId;

        const conversations = await conversationsCollection
          .aggregate([
            {
              $match: {
                $or: [
                  { guestId: new ObjectId(userId) },
                  { hostId: new ObjectId(userId) },
                ],
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "guestId",
                foreignField: "_id",
                as: "guest",
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "hostId",
                foreignField: "_id",
                as: "host",
              },
            },
            {
              $addFields: {
                otherUser: {
                  $cond: {
                    if: { $eq: ["$guestId", new ObjectId(userId)] },
                    then: { $arrayElemAt: ["$host", 0] },
                    else: { $arrayElemAt: ["$guest", 0] },
                  },
                },
              },
            },
            {
              $project: {
                guest: 0,
                host: 0,
              },
            },
            {
              $sort: { updatedAt: -1 },
            },
          ])
          .toArray();

        res.json(conversations);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({
          message: "Failed to fetch conversations",
          error: error.message,
        });
      }
    });

    // Get messages for a conversation
    app.get("/api/conversations/:conversationId/messages", async (req, res) => {
      try {
        const conversationId = req.params.conversationId;
        const { page = 1, limit = 50 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const messages = await messagesCollection
          .find({ conversationId: new ObjectId(conversationId) })
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        // Reverse to get chronological order
        messages.reverse();

        res.json(messages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch messages", error: error.message });
      }
    });

    // Send a message (also handled by Socket.io, but keeping REST endpoint for backup)
    app.post("/api/messages", async (req, res) => {
      try {
        const {
          conversationId,
          senderId,
          message,
          messageType = "text",
        } = req.body;

        if (!conversationId || !senderId || !message) {
          return res.status(400).json({
            message: "Conversation ID, sender ID, and message are required",
          });
        }

        const newMessage = {
          conversationId: new ObjectId(conversationId),
          senderId: new ObjectId(senderId),
          message,
          messageType,
          timestamp: new Date(),
          read: false,
        };

        const result = await messagesCollection.insertOne(newMessage);
        newMessage._id = result.insertedId;

        // Update conversation last message
        await conversationsCollection.updateOne(
          { _id: new ObjectId(conversationId) },
          {
            $set: {
              lastMessage: message,
              lastMessageTime: new Date(),
              lastMessageSender: new ObjectId(senderId),
              updatedAt: new Date(),
            },
          }
        );

        res.status(201).json(newMessage);
      } catch (error) {
        console.error("Error sending message:", error);
        res
          .status(500)
          .json({ message: "Failed to send message", error: error.message });
      }
    });

    // Get online users
    app.get("/api/users/online", (req, res) => {
      const onlineUserIds = Array.from(onlineUsers.keys());
      res.json(onlineUserIds);
    });

    // Add property to wishlist
    app.post("/api/wishlist", async (req, res) => {
      try {
        const { email, propertyId, name, image, price, host } = req.body;

        if (!email || !propertyId) {
          return res
            .status(400)
            .json({ message: "Email and propertyId are required" });
        }

        // Check if the property is already in the user's wishlist
        const exists = await wishListCollection.findOne({ email, propertyId });
        if (exists) {
          return res
            .status(400)
            .json({ message: "Property already in wishlist" });
        }

        const wishlistItem = {
          email,
          propertyId,
          name,
          image,
          price,
          host,
          createdAt: new Date(),
        };

        const result = await wishListCollection.insertOne(wishlistItem);
        res.status(201).json(wishlistItem);
      } catch (error) {
        console.error("Error adding to wishlist:", error);
        res
          .status(500)
          .json({ message: "Failed to add to wishlist", error: error.message });
      }
    });

    // Get wishlist by user email
    app.get("/api/wishlist", async (req, res) => {
      try {
        const { email } = req.query;

        if (!email)
          return res.status(400).json({ message: "Email is required" });

        const wishlist = await wishListCollection.find({ email }).toArray();
        res.json(wishlist);
      } catch (error) {
        console.error("Error fetching wishlist:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch wishlist", error: error.message });
      }
    });

    // Delete wishlist item by propertyId and email
    app.delete("/api/wishlist/:propertyId", async (req, res) => {
      try {
        const { propertyId } = req.params;
        const { email } = req.query;

        if (!email)
          return res.status(400).json({ message: "Email is required" });

        const result = await wishListCollection.deleteOne({
          email,
          propertyId,
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Wishlist item not found" });
        }

        res.json({ message: "Wishlist item removed successfully" });
      } catch (error) {
        console.error("Error deleting wishlist item:", error);
        res.status(500).json({
          message: "Failed to delete wishlist item",
          error: error.message,
        });
      }
    });

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
      try {
        const { email } = req.query;
        const query = email ? { email } : {}; // filter if email provided
        const bookings = await propertiesCollection.find(query).toArray();
        res.send(bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Server error" });
      }
    });
    // host manage property
    app.get("/manageproperty", async (req, res) => {
      const cursor = await propertiesCollection.find(
      ).toArray();
      res.send(cursor);
    });

    //git api  limit 8 data  home page
    app.get("/FeaturedProperties", async (req, res) => {
      const cursor = await propertiesCollection.find({
        status: "avaliable"
      }).limit(8).toArray();
      res.send(cursor);
    });
    // ?hello
    app.get("/FeaturepropertiesDitels/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.findOne(query);
      res.send(result);
    });
    //  guest booking data get api
    //  app.get("/bookinghotel", async (req, res) => {
    //   const { hostEmail } = req.query;

    //   if (!hostEmail) {
    //     return res.status(400).json({ message: "hostEmail query parameter is required" });
    //   }

    //   try {
    //     // ✅ সব property array হিসেবে আনো
    //     const properties = await propertiesCollection.find({ hostEmail }).toArray();

    //     const propertyIds = properties.map((p) => new ObjectId(p._id));

    //     if (propertyIds.length === 0) {
    //       return res.json([]); // host এর কোনো property নেই
    //     }

    //     // ✅ Booking গুলোও array হিসেবে আনো
    //     const bookings = await bookinghotelCollection
    //       .find({ propertyId: { $in: propertyIds } })
    //       .sort({ createdAt: -1 })
    //       .toArray();

    //     // ✅ নিশ্চিত করো তুমি শুধুমাত্র plain data পাঠাচ্ছো
    //     res.json(bookings);
    //   } catch (err) {
    //     console.error("Error fetching bookings:", err);
    //     res.status(500).json({ message: "Server error", error: err.message });
    //   }
    // });

    app.get("/bookinghotel", async (req, res) => {
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

    app.get("/totalBookings", async (req, res) => {
      try {
        const totalBookings = await bookinghotelCollection.countDocuments();
        res.json({ totalBookings });
      } catch (error) {
        console.error("Error fetching total bookings:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    //  app.get("/bookinghotel", async (req, res) => {
    //   try {
    //     const { email} = req.query;
    //     const query = email ? { email } : {}; // filter if email provided
    //     const bookings = await bookinghotelCollection.find(query).toArray();
    //     res.send(bookings);
    //   } catch (error) {
    //     console.error("Error fetching bookings:", error);
    //     res.status(500).json({ message: "Server error" });
    //   }
    // });

    app.patch("/bookings/:id", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      try {
        const result = await bookinghotelCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Fetch the updated booking to send back
        const updatedBooking = await bookinghotelCollection.findOne({
          _id: new ObjectId(id),
        });
        res.json({ booking: updatedBooking });
      } catch (err) {
        console.error("Error updating booking:", err);
        res.status(500).json({ message: "Server error", error: err.message });
      }
    });
    // get bookings data with email based
    // app.get("/myBookings", async (req, res) => {
    //   try {
    //     const { email } = req.query;
    //     const query = email ? { email } : {}; // filter if email provided

    //     // Use aggregation to join with properties and users collections to get host information
    //     const bookings = await bookinghotelCollection
    //       .aggregate([
    //         { $match: query },
    //         {
    //           // Add a field to convert propertyId string to ObjectId if needed
    //           $addFields: {
    //             propertyObjectId: {
    //               $cond: {
    //                 if: { $eq: [{ $type: "$propertyId" }, "objectId"] },
    //                 then: "$propertyId",
    //                 else: {
    //                   $cond: {
    //                     if: { $eq: [{ $type: "$propertyId" }, "string"] },
    //                     then: { $toObjectId: "$propertyId" },
    //                     else: null,
    //                   },
    //                 },
    //               },
    //             },
    //           },
    //         },
    //         {
    //           $lookup: {
    //             from: "properties",
    //             localField: "propertyObjectId",
    //             foreignField: "_id",
    //             as: "propertyDetails",
    //           },
    //         },
    //         {
    //           $unwind: {
    //             path: "$propertyDetails",
    //             preserveNullAndEmptyArrays: true,
    //           },
    //         },
    //         {
    //           $lookup: {
    //             from: "users",
    //             localField: "propertyDetails.email",
    //             foreignField: "email",
    //             as: "hostUser",
    //           },
    //         },
    //         {
    //           $unwind: {
    //             path: "$hostUser",
    //             preserveNullAndEmptyArrays: true,
    //           },
    //         },
    //         {
    //           $addFields: {
    //             id: "$hostUser._id",
    //             hostName: "$propertyDetails.host",
    //             propertyTitle: "$propertyDetails.title",
    //             // Ensure propertyId is set
    //             propertyId: {
    //               $ifNull: ["$propertyObjectId", "$propertyId"],
    //             },
    //           },
    //         },
    //         {
    //           $project: {
    //             propertyDetails: 0,
    //             hostUser: 0,
    //             propertyObjectId: 0, // Remove temporary field
    //           },
    //         },
    //       ])
    //       .toArray();

    //     res.send(bookings);
    //   } catch (error) {
    //     console.error("Error fetching bookings:", error);
    //     res.status(500).json({ message: "Server error" });
    //   }
    // });

    app.get("/myBookings", async (req, res) => {
      try {
        const { email } = req.query;
        const query = email ? { email } : {};

        const bookings = await bookinghotelCollection
          .aggregate([
            { $match: query },
            {
              $addFields: {
                propertyObjectId: {
                  $cond: {
                    if: { $eq: [{ $type: "$propertyId" }, "objectId"] },
                    then: "$propertyId",
                    else: {
                      $cond: {
                        if: { $eq: [{ $type: "$propertyId" }, "string"] },
                        then: { $toObjectId: "$propertyId" },
                        else: null,
                      },
                    },
                  },
                },
              },
            },
            {
              $lookup: {
                from: "properties",
                localField: "propertyObjectId",
                foreignField: "_id",
                as: "propertyDetails",
              },
            },
            {
              $unwind: {
                path: "$propertyDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "propertyDetails.email",
                foreignField: "email",
                as: "hostUser",
              },
            },
            {
              $unwind: {
                path: "$hostUser",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                hostId: "$hostUser._id",
                hostName: "$propertyDetails.host",
                propertyTitle: "$propertyDetails.title",
                propertyId: {
                  $ifNull: ["$propertyObjectId", "$propertyId"],
                },
              },
            },
            {
              $project: {
                propertyDetails: 0,
                hostUser: 0,
                propertyObjectId: 0,
              },
            },
          ])
          .toArray();

        // ✅ ADD THESE CONSOLE LOGS
        // console.log("=== MYBOOKINGS DEBUG ===");
        // console.log("Query email:", email);
        // console.log("Number of bookings found:", bookings.length);
        if (bookings.length > 0) {
          // console.log("First booking raw:", bookings[0]);
          // console.log("hostId:", bookings[0].hostId);
          // console.log("hostName:", bookings[0].hostName);
          // console.log("propertyId:", bookings[0].propertyId);
        }
        // console.log("=======================");

        res.send(bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Server error" });
      }
    });
    // real time clanander bookong api 
    app.get("/checkBooking", async (req, res) => {
      const { roomId, checkIn, checkOut } = req.query;
      const existingBooking = await bookinghotelCollection.findOne({
        id: roomId,
        $or: [
          {
            Checkin: { $lte: checkOut },
            Checkout: { $gte: checkIn },
          },
        ],
      });
      res.send({ isBooked: !!existingBooking });
    });
    // booking data post
    app.post("/bookinghotel", async (req, res) => {
      try {
        const bookingData = req.body;

        // Ensure propertyId is stored as ObjectId if it exists and is a string
        if (bookingData.propertyId) {
          if (typeof bookingData.propertyId === "string") {
            bookingData.propertyId = new ObjectId(bookingData.propertyId);
          }
        } else if (bookingData.id && typeof bookingData.id === "string") {
          // Fallback: if propertyId doesn't exist but 'id' does, use it
          bookingData.propertyId = new ObjectId(bookingData.id);
        }

        // hello
        // Add timestamp
        bookingData.createdAt = new Date();
        bookingData.updatedAt = new Date();

        const result = await bookinghotelCollection.insertOne(bookingData);
        res.send(result);
      } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({
          message: "Failed to create booking",
          error: error.message,
        });
      }
    });
    // ...existing code...

    // Delete booking by ID
    app.delete("/bookinghotel/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await bookinghotelCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Booking not found" });
        }

        res.json({ message: "Booking deleted successfully" });
      } catch (error) {
        res.status(500).json({ message: "Error deleting booking", error });
      }
    });

    // Utility endpoint to migrate existing bookings (add propertyId as ObjectId)
    app.post("/api/migrate-bookings", async (req, res) => {
      try {
        // Find all bookings that need migration
        const bookings = await bookinghotelCollection.find({}).toArray();

        let migratedCount = 0;
        let errorCount = 0;

        for (const booking of bookings) {
          try {
            const updates = {};

            // If propertyId doesn't exist or is a string, convert it
            if (booking.id && !booking.propertyId) {
              updates.propertyId = new ObjectId(booking.id);
            } else if (
              booking.propertyId &&
              typeof booking.propertyId === "string"
            ) {
              updates.propertyId = new ObjectId(booking.propertyId);
            }

            // Add timestamps if missing
            if (!booking.createdAt) {
              updates.createdAt = booking.createdAt || new Date();
            }
            if (!booking.updatedAt) {
              updates.updatedAt = new Date();
            }

            // Update if there are changes
            if (Object.keys(updates).length > 0) {
              await bookinghotelCollection.updateOne(
                { _id: booking._id },
                { $set: updates }
              );
              migratedCount++;
            }
          } catch (err) {
            console.error(`Error migrating booking ${booking._id}:`, err);
            errorCount++;
          }
        }

        res.json({
          message: "Migration completed",
          totalBookings: bookings.length,
          migratedCount,
          errorCount,
        });
      } catch (error) {
        console.error("Migration error:", error);
        res.status(500).json({
          message: "Migration failed",
          error: error.message,
        });
      }
    });

    // host Add property
    app.post("/AddProperty", async (req, res) => {
      const AddProperty = req.body;
      // console.log(newProperty);
      const result = await propertiesCollection.insertOne(AddProperty);
      res.send(result);
    });

    app.patch("/AddProperty/:id", async (req, res) => {
      const { id } = req.params;
      const { propertystatus } = req.body;

      try {
        const result = await propertiesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { propertystatus } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Fetch the updated booking to send back
        const updatedBooking = await propertiesCollection.findOne({
          _id: new ObjectId(id),
        });
        res.json({ booking: updatedBooking });
      } catch (err) {
        console.error("Error updating booking:", err);
        res.status(500).json({ message: "Server error", error: err.message });
      }
    });

    // host dashbord update api
    app.patch("/Property/:id", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      try {
        const result = await propertiesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Fetch the updated booking to send back
        const updatedBooking = await propertiesCollection.findOne({
          _id: new ObjectId(id),
        });
        res.json({ booking: updatedBooking });
      } catch (err) {
        console.error("Error updating booking:", err);
        res.status(500).json({ message: "Server error", error: err.message });
      }
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
        const result = await propertiesCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Property not found" });
        }

        res.json({ message: "Property deleted successfully" });
      } catch (error) {
        res.status(500).json({ message: "Error deleting property", error });
      }
    });

    // ...existing code...

    // ✅ PATCH: Update user role (Admin endpoint)
    app.patch("/users/role/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { role } = req.body;

        if (!role) {
          return res.status(400).json({ message: "Role is required" });
        }

        const query = { _id: new ObjectId(id) };
        const update = { $set: { role } };

        // Update in users collection
        const result = await usersCollection.updateOne(query, update);

        // Also update in hostRequestCollection if exists
        await hostRequestCollection.updateOne(
          { userId: id },
          { $set: { status: "approved", newRole: role } },
          { upsert: false }
        );

        if (result.modifiedCount > 0) {
          res.json({ message: `User role updated to ${role}` });
        } else {
          res
            .status(404)
            .json({ message: "User not found or role not changed" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating role", error });
      }
    });

    // ✅ PATCH: Update user status (Active / Suspended / Rejected)
    app.patch("/users/status/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;

        if (!status) {
          return res.status(400).json({ message: "Status is required" });
        }

        const query = { _id: new ObjectId(id) };
        const update = { $set: { status } };

        const result = await usersCollection.updateOne(query, update);

        if (result.modifiedCount > 0) {
          res.json({ message: `User status updated to ${status}` });
        } else {
          res
            .status(404)
            .json({ message: "User not found or status not changed" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating status", error });
      }
    });

    // 🗑️ Delete user (Reject)
    app.delete("/users/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const query = { _id: new ObjectId(id) };

        // Delete user from users collection
        const userDeleteResult = await usersCollection.deleteOne(query);

        // Optional: also delete related host request if exists
        await hostRequestCollection.deleteMany({ userId: id });

        if (userDeleteResult.deletedCount === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "User rejected and deleted successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting user" });
      }
    });

    // ==================== PAYMENT ENDPOINTS ====================

    // get all payments
    app.get("/payments", async (req, res) => {
      const results = await paymentsCollection.find().toArray();
      res.send(results);
    });

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

    /**
     * Create Experience
     * POST /api/experiences
     * Body: { name, email, title, description, location, photos: [url1, url2], userId (optional) }
     * Note: No auth middleware for now. We rely on provided email/name from frontend.
     */
    app.post("/api/experiences", async (req, res) => {
      try {
        const { name, email, title, description, location, photos, userId } =
          req.body;

        console.log("Received experience data:", req.body);
        console.log("Required fields check:", {
          name,
          email,
          title,
          description,
        });

        // Basic validation
        if (!name || !email || !title || !description) {
          console.log("Validation failed - missing required fields");
          return res.status(400).json({ error: "Missing required fields" });
        }

        const experience = {
          userId: userId ? String(userId) : null,
          userName: name,
          userEmail: email,
          title,
          description,
          location: location || null,
          photos: Array.isArray(photos) ? photos : [],
          ratings: [], // { raterEmail, value }
          avgRating: 0,
          ratingsCount: 0,
          createdAt: new Date(),
        };

        const result = await experiencesCollection.insertOne(experience);
        res.status(201).json({ ...experience, _id: result.insertedId });
      } catch (err) {
        console.error("POST /api/experiences error:", err);
        res.status(500).json({ error: "Server error" });
      }
    });

    /**
     * Get all experiences
     * GET /api/experiences
     * Query: optional ?page=1&limit=10
     */
    app.get("/api/experiences", async (req, res) => {
      try {
        const page = Math.max(1, parseInt(req.query.page || "1"));
        const limit = Math.max(1, parseInt(req.query.limit || "20"));
        const skip = (page - 1) * limit;

        const cursor = experiencesCollection
          .find({})
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);

        const experiences = await cursor.toArray();
        res.json(experiences);
      } catch (err) {
        console.error("GET /api/experiences error:", err);
        res.status(500).json({ error: "Server error" });
      }
    });

    /**
     * Rate an experience
     * POST /api/experiences/:id/rate
     * Body: { raterEmail, value }  // value integer 1..10
     * No duplicate ratings from same raterEmail allowed.
     */
    app.post("/api/experiences/:id/rate", async (req, res) => {
      try {
        const { id } = req.params;
        const { raterEmail, value } = req.body;
        const intVal = parseInt(value, 10);

        if (!raterEmail || !id || isNaN(intVal) || intVal < 1 || intVal > 10) {
          return res.status(400).json({ error: "Invalid rating data" });
        }

        const objId = new ObjectId(id);

        // Check existing rating by same raterEmail
        const already = await experiencesCollection.findOne({
          _id: objId,
          "ratings.raterEmail": raterEmail,
        });

        if (already) {
          return res
            .status(400)
            .json({ error: "You have already rated this experience" });
        }

        // Push rating and update count; then recalc avg
        await experiencesCollection.updateOne(
          { _id: objId },
          {
            $push: { ratings: { raterEmail, value: intVal } },
            $inc: { ratingsCount: 1 },
          }
        );

        // Recalculate avgRating from ratings array
        const updated = await experiencesCollection.findOne({ _id: objId });
        const avg =
          updated.ratings && updated.ratings.length > 0
            ? updated.ratings.reduce((s, r) => s + r.value, 0) /
            updated.ratings.length
            : 0;

        await experiencesCollection.updateOne(
          { _id: objId },
          { $set: { avgRating: avg } }
        );

        const final = await experiencesCollection.findOne({ _id: objId });
        res.json(final);
      } catch (err) {
        console.error("POST /api/experiences/:id/rate error:", err);
        res.status(500).json({ error: "Server error" });
      }
    });

    // review section

    app.post("/api/reviews", async (req, res) => {
      try {
        const reviewData = req.body;
        const newReview = await reviewCollection.insertOne(reviewData);
        res.status(201).json({ success: true, data: newReview });
      } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ success: false, message: "Server Error" });
      }
    });

    // GET:  reviews with email
    app.get("/api/reviews", async (req, res) => {
      try {
        const { reviewCardId } = req.query; // get ?reviewCardId=xyz
        const query = reviewCardId ? { reviewCardId } : {}; // filter only if provided
        const reviews = await reviewCollection.find(query).toArray();
        res.json({ success: true, data: reviews });
      } catch (err) {
        res.status(500).json({ success: false, message: err.message });
      }
    });

    // Update a review
    app.put("/api/reviews/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid ID" });
        }

        const result = await reviewCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: req.body },
          { returnDocument: "after" }
        );

        if (!result.value) {
          return res
            .status(404)
            .json({ success: false, message: "Review not found" });
        }

        res.status(200).json({ success: true, data: result.value });
      } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // Delete a review
    app.delete("/api/reviews/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await reviewCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Review not found" });
        }

        res
          .status(200)
          .json({ success: true, message: "Review deleted successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get("/api/allReview", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result)
    })

    app.get("/api/hostReview", async (req, res) => {
      try {
        const { email } = req.query; // get ?email= from query params
        let query = {};

        // if email is provided, filter by it
        if (email) {
          query = { reviewEmail: email };
        }

        const result = await reviewCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).send({ message: "Server error", error });
      }
    });




    /**
     * Delete experience (only by matching email)
     * DELETE /api/experiences/:id
     * Body: { email }  // client must supply creator email to authorize deletion (no auth middleware)
     */
    app.delete("/api/experiences/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { email } = req.body;

        if (!id || !email)
          return res.status(400).json({ error: "Missing data" });

        const objId = new ObjectId(id);

        const result = await experiencesCollection.deleteOne({
          _id: objId,
          userEmail: email,
        });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .json({ error: "Experience not found or unauthorized" });
        }

        res.json({ message: "Experience deleted" });
      } catch (err) {
        console.error("DELETE /api/experiences/:id error:", err);
        res.status(500).json({ error: "Server error" });
      }
    });
    /* ---------- End Experiences feature ---------- */

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

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Socket.io server is ready for connections`);
});
