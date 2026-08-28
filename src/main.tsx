import { createRoot } from "react-dom/client";
import { ArenaGame } from "./ArenaGame";
import "./styles.css";

const root = document.getElementById("root");

if (!root) throw new Error("Elemento #root não encontrado.");

createRoot(root).render(<ArenaGame />);
