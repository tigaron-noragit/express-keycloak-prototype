const { config } = require("dotenv");
const { Router } = require("express");
config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });
const { NODE_ENV, PORT } = process.env;
const express = require("express");
const morgan = require("morgan");
const fs = require("fs");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const { Strategy } = require("passport-saml");

async function errorMiddleware(error, req, res, next) {
  try {
    const status = error.status || 500;
    const message = error.message || "Something went wrong";
    res.status(status).json({ message });
  } catch (error) {
    next(error);
  }
}

class IndexController {
  async index(req, res, next) {
    try {
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }
}

class LoginController {
  async login(req, res, next) {
    try {
      next();
    } catch (error) {
      next(error);
    }
  }

  async callback(req, res, next) {
    try {
      res.send(req.user);
    } catch (error) {
      next(error);
    }
  }
}

class IndexRoute {
  constructor() {
    this.path = "/";
    this.router = Router();
    this.indexController = new IndexController();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.get(`${this.path}`, this.indexController.index);
  }
}

class LoginRoute {
  constructor() {
    this.path = "/login";
    this.router = Router();
    this.loginController = new LoginController();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.get(
      `${this.path}`,
      this.loginController.login,
      passport.authenticate("samlStrategy")
    );
    this.router.post(
      `${this.path}/callback`,
      this.loginController.login,
      passport.authenticate("samlStrategy"),
      this.loginController.callback
    );
  }
}

class App {
  constructor(routes) {
    this.app = express();
    this.env = NODE_ENV || "development";
    this.port = PORT || 3000;
    this.samlConfig = {
      issuer: "express-kc",
      entityId: "SAML-SSO-App",
      callbackUrl: "https://localhost:5000/login/callback",
      signOut: "https://localhost:5000/logout/callback",
      entryPoint: "https://localhost:8443/realms/test/protocol/saml",
    };

    this.initializeMiddlewares();
    this.initializePassport();
    this.initializeRoutes(routes);
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    this.app.use(morgan("short"));
    this.app.use(cookieParser());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  initializePassport() {
    this.app.use(
      session({
        secret: "secret",
        resave: false,
        saveUninitialized: true,
      })
    );
    passport.use(
      "samlStrategy",
      new Strategy(
        {
          callbackUrl: this.samlConfig.callbackUrl,
          entryPoint: this.samlConfig.entryPoint,
          issuer: this.samlConfig.issuer,
          identifierFormat: null,
          decryptionPvk: fs.readFileSync("sp-pvt.key.pem", "utf8"),
          cert: fs.readFileSync("idp-pub.key.pem", "utf8"),
          privateKey: fs.readFileSync("sp-pvt.key.pem", "utf8"),
          validateInResponseTo: true,
          disableRequestedAuthnContext: true,
        },
        (profile, done) => {
          console.log("passport.use() profile: %s \n", JSON.stringify(profile));
          return done(null, profile);
        }
      )
    );
    passport.serializeUser(function (user, done) {
      console.log("passport.serializeUser(): %s \n", JSON.stringify(user));
      done(null, user);
    });
    passport.deserializeUser(function (user, done) {
      console.log("passport.deserializeUser(): %s \n", JSON.stringify(user));
      done(null, user);
    });
  }

  initializeRoutes(routes) {
    routes.forEach((route) => {
      this.app.use("/", route.router);
    });
  }

  initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }

  getServer() {
    return this.app;
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`======= ENV: ${this.env} =======`);
      console.log(`🚀 App listening on the port ${this.port}`);
    });
  }
}

const app = new App([new IndexRoute(), new LoginRoute()]);
app.listen();
