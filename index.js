const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
require("dotenv").config();
const body_parser = require("body-parser")

app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: true, }));

app.use(cors({ origin: '*' }));
// app.use('/public', express.static(path.join(__dirname, 'public')));
const publicPath = path.join(__dirname, 'public');
app.use('/public', express.static(publicPath));

// Add this to verify the static path
console.log('Static files served from:', publicPath);
app.get("/", (req, res) => { res.json("Working") });


const UsersRoutes = require("./Router/UsersRouter");
const BusinessRouter = require("./Router/BusinessRouter");
const ReportsRouter = require("./Router/ReportsRouter");
const DashboardRouter = require("./Router/DashboardRouter");
const MastersRouter = require("./Router/MastersRouter");

app.use("/Users", UsersRoutes)
app.use("/Business", BusinessRouter)
app.use("/Reports", ReportsRouter)
app.use("/Dashboard", DashboardRouter)
app.use("/Masters", MastersRouter)


app.listen(process.env.PORT, (error) => {
  if (!error) {
    console.log("✅ CRM Server is running on port " + process.env.PORT);
  } else {
    console.log("❌ CRM Server error:", error);
  }
});
