import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const rootDivElement = document.getElementById("root");

if (!rootDivElement) {
  throw new Error('Could not find root element with id "root"');
}

const reactRoot = ReactDOM.createRoot(rootDivElement);

reactRoot.render(<App />);
