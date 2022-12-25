import "react-json-pretty/themes/monikai.css";

/* eslint-disable react/react-in-jsx-scope */
import axios from "axios";
import Head from "next/head";
import { ReactNode, useState } from "react";
import JSONPretty from "react-json-pretty";
import { AddIcon } from "../assets/AddIcon";
import { DuplicateIcon } from "../assets/DuplicateIcon";
import { RemoveIcon } from "../assets/RemoveIcon";
import Button from "../src/components/Button";
import { Processor } from "../src/features/processor";
import { Subtitle, Title } from "../src/components/Typography";
import { downloadObjectAsJson } from "../src/utils/downloadObjectAsJson";
import { Input } from "../src/components/Input";
import { useLoadconfig } from "../src/hooks/useLoadConfig";

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
  const [route, setRoute] = useState("example");
  const { endpoint, routes, setConfig } = useLoadconfig();
  const [routesJsonMap, setRoutesJsonMap] = useState<Record<string, unknown>>(
    {}
  );

  const onRouteAdd = () => {
    if (endpoint) setConfig({ endpoint, routes: [...(routes ?? []), route] });
  };

  const onRouteRemove = (routeToRemove: string) => {
    if (endpoint)
      setConfig({
        endpoint,
        routes:
          routes?.filter((existingRoute) => existingRoute !== routeToRemove) ??
          [],
      });
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
            onChange={(value) =>
              setConfig({ routes: routes ?? [], endpoint: value })
            }
            className="bg-card-input rounded-sm px-4 py-2 border-2 border-gray-600 w-[300px]"
          />
        </CardPane>

        <CardPane title="Endpoints">
          <div className="flex align-middle gap-2">
            <Input
              className="bg-card-input rounded-sm px-4 py-2 border-2 border-gray-600 w-[300px]"
              value={route}
              onChange={setRoute}
            />
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
