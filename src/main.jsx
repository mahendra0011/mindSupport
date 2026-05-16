import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App.jsx";
import "./index.css";
import { store } from "./store";

const pendingSpaRedirect = sessionStorage.getItem("mindsupport:spa-redirect");
if (pendingSpaRedirect) {
    sessionStorage.removeItem("mindsupport:spa-redirect");
    window.history.replaceState(null, "", pendingSpaRedirect);
}

createRoot(document.getElementById("root")).render(<Provider store={store}>
    <App />
  </Provider>);
