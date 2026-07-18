import { useState, useEffect } from "react";
import { networkManager, type ConnectionState } from "./NetworkManager";

export function useNetworkState() {
  const [state, setState] = useState<ConnectionState>(networkManager.getState());

  useEffect(() => {
    const unsubscribe = networkManager.subscribe((newState) => {
      setState(newState);
    });
    return () => { unsubscribe(); };
  }, []);

  return state;
}
