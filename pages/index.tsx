import "react-json-pretty/themes/monikai.css";

/* eslint-disable react/react-in-jsx-scope */
import axios from "axios";
import Head from "next/head";
import { ReactNode, useEffect, useState } from "react";
import JSONPretty from "react-json-pretty";
import { AddIcon } from "../assets/AddIcon";
import { DuplicateIcon } from "../assets/DuplicateIcon";
import { RemoveIcon } from "../assets/RemoveIcon";
import Button from "../src/components/Button";
import { Processor } from "../src/features/processor";
import { Subtitle, Title } from "../src/components/Typography";
import { downloadObjectAsJson } from "../src/utils/downloadObjectAsJson";
import { Input } from "../src/components/Input";
import { DUMPEY_KEY } from "../src/config";

const DEFAULT_STRAPI_ENDPOINT = "http://localhost:1337";

type Props = {
  title: string;
  children: ReactNode;
};
const CardPane = ({ title, children }: Props) => {
  return (
    <div className="bg-bg-primary mb-4 p-8 rounded-md">
      <Title>{title}</Title>
      {children}
    </div>
  );
};
export default function Home() {
  const [endpoint, setEndpoint] = useState<string>();
  const [route, setRoute] = useState("example");
  const [routes, setRoutes] = useState<string[]>();
  // const [routesJsonMap, setRoutesJsonMap] = useState<Record<string, unknown>>({
  //   athletes: testData,
  // });
  const [routesJsonMap, setRoutesJsonMap] = useState<Record<string, unknown>>(
    {}
  );

  const loadConfig = () => {
    const stringifiedConfig = localStorage.getItem(DUMPEY_KEY);
    console.log("stringifiedConfig", stringifiedConfig);

    if (stringifiedConfig) {
      const config: {
        endpoint: string;
        routes: string[];
      } = JSON.parse(stringifiedConfig);

      setEndpoint(config.endpoint);
      setRoutes(config.routes);
    }
  };

  const persistConfig = () => {
    console.log("endpoint", endpoint);
    localStorage.setItem(
      DUMPEY_KEY,
      JSON.stringify({
        endpoint,
        routes,
      })
    );
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (!endpoint || !routes) return;

    const listener = () => {
      persistConfig();
    };

    window.addEventListener("beforeunload", listener);

    console.log(endpoint);
    return () => {
      window.removeEventListener("beforeunload", listener);
    };
  }, [routes, endpoint]);

  console.log("***", endpoint);
  const onRouteAdd = () => {
    setRoutes([...(routes || []), route]);
  };

  const onRouteRemove = (routeToRemove: string) => {
    setRoutes(
      routes?.filter((existingRoute) => existingRoute !== routeToRemove)
    );
  };

  const dumpStrapi = async () => {
    setRoutesJsonMap({});
    if (!routes) return;
    await Promise.all(
      routes?.map(async (route) => {
        const data = await axios.get(`${endpoint}/${route}`);
        setRoutesJsonMap((oldRoutesJson) => ({
          ...oldRoutesJson,
          [route]: data.data,
        }));
      })
    );
  };

  return (
    <div className="bg-bg-primary min-h-screen p-4">
      <Head>
        <title>Strapi Dumper</title>
        <meta name="description" content="Dump your strapi API schema" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-[1200px] mx-auto text-white bg-card px-20 py-14 rounded-md">
        <CardPane title="Add Strapi endpoint">
          <Input
            value={endpoint ?? DEFAULT_STRAPI_ENDPOINT}
            onChange={setEndpoint}
          />
        </CardPane>

        <CardPane title="Endpoints">
          <div className="flex align-middle gap-2">
            <Input value={route} onChange={setRoute} />
            <button
              type="button"
              className="disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onRouteAdd}
              disabled={routes?.includes(route)}
            >
              <AddIcon />
            </button>
          </div>
          <h4 className="text-xl mt-4">Routes</h4>
          <ul className="mt-2">
            {routes?.map((route) => (
              <li key={route} className="flex">
                <p className="bg-card-input border border-gray-600 mb-2 p-2 w-[300px]">{`/${route}`}</p>
                <button
                  className="ml-2"
                  type="button"
                  onClick={() => onRouteRemove(route)}
                >
                  <RemoveIcon />
                </button>
              </li>
            ))}
          </ul>
        </CardPane>

        <Button disabled={routes?.length === 0} onClick={dumpStrapi}>
          Generate JSON
        </Button>

        <Subtitle>Results</Subtitle>
        <div className="flex flex-col gap-2 mt-8">
          {Object.entries(routesJsonMap).map(([route, jsonData]) => (
            <div key={route} className="flex-1 overflow-hidden min-w-[350px]">
              <div
                className="bg-card-input p-4 flex align-middle justify-between cursor-pointer"
                onClick={() => downloadObjectAsJson(jsonData, route)}
              >
                {route}
                <DuplicateIcon />
              </div>
              <JSONPretty
                className="w-full overflow-scroll no-scrollbar max-h-[300px]"
                themeClassName="__json-pretty__ no-scrollbar"
                data={jsonData}
              />
            </div>
          ))}
        </div>

        <Processor jsonData={routesJsonMap} />
      </main>
    </div>
  );
}
