import { useEffect, useState } from "react";
import { DUMPER_KEY } from "../config/index";

const getConfig = () => {
  const stringifiedConfig = localStorage.getItem(DUMPER_KEY);

  if (stringifiedConfig) {
    const config: Config = JSON.parse(stringifiedConfig);
    return config;
  }
};

const DEFAULT_STRAPI_ENDPOINT = "http://localhost:1337";
type Config = {
  endpoint: string;
  routes: string[];
  migrationEndpoint: string;
};
export const useLoadconfig = () => {
  const [endpoint, setEndpoint] = useState<string>();
  const [migrationEndpoint, setMigrationEndpoint] = useState<string>();
  const [routes, setRoutes] = useState<string[]>();

  const setConfig = (newConfig: Partial<Config>) => {
    const oldConfig = getConfig();
    localStorage.setItem(DUMPER_KEY, JSON.stringify({...oldConfig, ...newConfig}));
    if (newConfig.routes) setRoutes(newConfig.routes);
    if (newConfig.endpoint) setEndpoint(newConfig.endpoint);
    if (newConfig.migrationEndpoint) setMigrationEndpoint(newConfig.endpoint);
  };

  const loadConfig = () => {
    if (typeof window === "undefined") return;

    const config = getConfig();

    if (config?.migrationEndpoint)
      setMigrationEndpoint(config.migrationEndpoint);
    if (config?.routes) setRoutes(config.routes);
    if (config?.endpoint) setEndpoint(config.endpoint);
  };

  useEffect(() => loadConfig(), []);

  return {
    routes,
    endpoint: endpoint ?? DEFAULT_STRAPI_ENDPOINT,
    migrationEndpoint: migrationEndpoint ?? DEFAULT_STRAPI_ENDPOINT,
    setConfig,
  };
};
