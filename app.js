const { config } = require("dotenv");
const { Router } = require("express");
config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });
const { NODE_ENV, PORT } = process.env;
const express = require("express");
const morgan = require("morgan");

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

class LoginController {
  async login(req, res, next) {
    try {
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
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
    this.router.get(`${this.path}`, this.loginController.login);
  }
}

class App {
  constructor(routes) {
    this.app = express();
    this.env = NODE_ENV || "development";
    this.port = PORT || 3000;

    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeErrorHandling();
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`======= ENV: ${this.env} =======`);
      console.log(`🚀 App listening on the port ${this.port}`);
    });
  }

  getServer() {
    return this.app;
  }

  initializeMiddlewares() {
    this.app.use(morgan("short"));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  initializeRoutes(routes) {
    routes.forEach((route) => {
      this.app.use("/", route.router);
    });
  }

  initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

const app = new App([new IndexRoute(), new LoginRoute()]);
app.listen();
