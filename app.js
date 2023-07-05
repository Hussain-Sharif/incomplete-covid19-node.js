const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;

const initilize = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server is started at http://localhost/:3000");
    });
  } catch (error) {
    console.log(`DB ERROR==> ${error}`);
    process.exit(1);
  }
};

initilize();

//API 1
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    //Unregistered user
    response.status(400);
    response.send("Invalid user");
  } else {
    //Registered User
    const passwordCheck = await bcrypt.compare(password, dbUser.password);
    if (passwordCheck === undefined) {
      response.status(400);
      response.send("Invalid password");
    } else {
      let payload = { username: username };
      const jwtToken = await jwt.sign(payload, "MY_S");
      response.send({ jwtToken });
    }
  }
});

//MIDDLEWARE-FUNCTION
const middle1 = (request, response, next) => {
  let jwtToken;
  const authHead = request.headers["authorization"];
  if (authHead !== undefined) {
    jwtToken = authHead.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_S", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};
// {
//   "jwkToken": "eyJhbGciOiJIUzI1NiJ9.Y2hyaXN0b3BoZXJfcGhpbGxpcHM.HUZ_attW8-TrT5O18HhLW_PjSPudgdM0irAGXwu-1Ec"
// }

//API 2
app.get("/states/", middle1, async (request, response) => {
  const gQuery = `
    SELECT * FROM state;
    `;
  const gResult = await db.all(gQuery);
  response.send(gResult);
});
