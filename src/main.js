import "./style.css";
import { setupApp } from "./counter.js";

const app = document.querySelector("#app");

if (app) {
  setupApp(app);
}