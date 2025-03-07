import App from "./app";
import loginController from "./controllers/login.controller"; // FIGYELD: kisbetűs név!

const app = new App([loginController]); // NE használj `new`-t
