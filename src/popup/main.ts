import { createElement, render } from "preact";
import MainApp from "./components/MainApp";

render(createElement(MainApp, {}), document.getElementById("app")!!);
