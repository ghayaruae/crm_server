const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
require("dotenv").config();

app.use(cors({ origin: '*' }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.get("/", (req, res) => { res.json("Working") });


const UsersRoutes = require("./Router/UsersRouter")

app.use("/Users", UsersRoutes)


app.listen(process.env.PORT, (error) => {
  if (!error) {
    console.log("✅ CRM Server is running on port " + process.env.PORT);
  } else {
    console.log("❌ CRM Server error:", error);
  }
});
