import { useEffect, useState } from "react";
import { DUMPER_KEY } from "../config/index";

export const useLoadconfig = () => {
  const [endpoint, setEndpoint] = useState<string>();
  const [routes, setRoutes] = useState<string[]>();

  const setConfig = (newConfig: { endpoint: string; routes: string[] }) => {
    localStorage.setItem(DUMPER_KEY, JSON.stringify(newConfig));
    setRoutes(newConfig.routes);
    setEndpoint(newConfig.endpoint);
  };

  const loadConfig = () => {
    if (typeof window === "undefined") return;

    const stringifiedConfig = localStorage.getItem(DUMPER_KEY);

    if (stringifiedConfig) {
      const config: {
        endpoint: string;
        routes: string[];
      } = JSON.parse(stringifiedConfig);

      setRoutes(config.routes);
      setEndpoint(config.endpoint);
    }
  };

  useEffect(() => loadConfig(), []);

  return {
    routes,
    endpoint,
    setConfig,
  };
};
