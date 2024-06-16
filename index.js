const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000



app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "https://bistro-boss-18f77.web.app"
      ],
      credentials: true,
    })
  );
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1kmrgvs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const userCollection = client.db('bistroBoss').collection('users')
    const menuCollection = client.db('bistroBoss').collection('menu')
    const reviewCollection = client.db('bistroBoss').collection('reviews')
    const cartCollection = client.db('bistroBoss').collection('carts')





    //========= jwt token related api part start =================
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' });
      res.send({ token });
    })


     // middlewares 
     const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

     // use verify admin after verifyToken
     const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }
    //========= jwt token related api part end ===================





    //========= user related api part start =================
    app.post('/user/api/create',async(req,res)=>{
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })



    app.get('/all-users/api/get',verifyToken,verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });


    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })


    
    app.delete('/users/api/delete/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const deleteId = req.params.id
      const query = {_id: new ObjectId(deleteId)}
      const result = await userCollection.deleteOne(query)
      res.send(result)
    })

    app.patch('/users/api/admin/:id',verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })
    //========= user related api part end ===================



















    //========= menu related api part start =================
    app.post('/menu/api/create',verifyToken,verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });

    app.get('/menu/api/get',async(req,res)=>{
        const result = await menuCollection.find().toArray()
        res.send(result)
    })

    app.get('/menu/api/singleMenu/get/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id :new ObjectId(id) }
      const result = await menuCollection.findOne(query)
      res.send(result)

    })

    app.patch('/menu/api/update/:id',async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id:new ObjectId(id) }
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
      }
      const result = await menuCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })

    app.delete('/menu/api/delete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id:new ObjectId(id) }
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    })
    //========= menu related api part end ===================




















    //========= review related api part start =================
    app.get('/review/api/get',async(req,res)=>{
        const result = await reviewCollection.find().toArray()
        res.send(result)
    })
    //========= review related api part end ===================

    //========= cart related api part start =================
    app.post('/carts/api/create',async(req,res)=>{
      const cartItem = req.body
      const result = await cartCollection.insertOne(cartItem)
      res.send(result)
    })

    app.get('/carts/api/get/:email',async(req,res)=>{
      const getEmail = req.params.email
      const query = {email:getEmail}
      const result = await cartCollection.find(query).toArray()
      res.send(result)
    })

    app.delete('/carts/api/delete/:id',async(req,res)=>{
      const deleteId = req.params.id
      const query = {_id: new ObjectId(deleteId)}
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })
    //========= cart related api part end ===================










    await client.db("admin").command({ ping: 1 });
    console.log("You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('bistro boss server')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})