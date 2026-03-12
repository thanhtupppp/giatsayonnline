import { useContext } from "react";
import { ConnectionContext } from "./ConnectionContext";

export function useConnection() {
  return useContext(ConnectionContext);
}
