import 'react-json-pretty/themes/monikai.css';

/* eslint-disable react/react-in-jsx-scope */
import axios from 'axios';
import Head from 'next/head'
import { ReactNode, useState } from 'react'
import JSONPretty from 'react-json-pretty';
import { AddIcon } from '../assets/AddIcon';
import { DuplicateIcon } from '../assets/DuplicateIcon';
import { RemoveIcon } from '../assets/RemoveIcon';

function downloadObjectAsJson(exportObj: Record<string, unknown>, exportName: string){
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

const DEFAULT_STRAPI_ENDPOINT = 'http://localhost:1337';

const Input = ({ value , onChange}: {value: string, onChange: (newValue: string) => void}) => {
  return (
    <input type="text" className='bg-card-input rounded-sm px-4 py-2 border-2 border-gray-600 w-[250px]' value={value} onChange={(e) => onChange(e.currentTarget.value)} />
  )
}

type Props = {
  title: string;
  children: ReactNode;
}
const CardPane = ({title, children}: Props) => {

return (
    <div className='bg-bg-primary mb-4 p-8 rounded-md'>
      <h3 className='text-gray-200 text-2xl mb-4'>{title}</h3>
      {children}
    </div>
  )
};

export default function Home() {
  const [endpoint, setEndpoint] = useState(DEFAULT_STRAPI_ENDPOINT);
  const [route, setRoute] = useState('example');
  const [routes, setRoutes] = useState<string[]>([]);
  const [routesJsonMap, setRoutesJsonMap] = useState<Record<string, Record<string, unknown>>>({});

  const onRouteAdd = () => {
    setRoutes([...routes, route])
  }

  const onRouteRemove = (routeToRemove: string) => {
    setRoutes(routes.filter(existingRoute => existingRoute !== routeToRemove))
  }

  const dumpStrapi = async () => {
    setRoutesJsonMap({});
    await Promise.all(routes.map(async route => {
      const data = await axios.get(`${endpoint}/${route}`)
      console.log('***', data)
      setRoutesJsonMap((oldRoutesJson) => ( {
        ...oldRoutesJson,
        [route]: data.data,
      } ))
    }));
  }

  return (
    <div className='bg-bg-primary min-h-screen p-4'>
      <Head>
        <title>Strapi Dumper</title>
        <meta name="description" content="Dump your strapi API schema" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className='max-w-[1200px] mx-auto text-white bg-card px-20 py-14 rounded-md'>

        <CardPane title='Add Strapi endpoint'>
          <Input value={endpoint} onChange={setEndpoint} />
        </CardPane>

        <CardPane title='Endpoints'>
          <div className='flex align-middle gap-2'>
              <Input value={route} onChange={setRoute} />
              <button type="button" onClick={onRouteAdd} disabled={routes.includes(route)}>
                <AddIcon />
              </button>
          </div>
          <h4 className='text-xl mt-4'>Routes</h4>
          <ul className='mt-2'>
            {routes.map(route => (
              <li key={route} className="flex">
                <p className='bg-card-input border border-gray-600 mb-2 p-2 w-[250px]'>{`/${route}`}</p>
                <button type="button" onClick={() => onRouteRemove(route)}><RemoveIcon /></button>
              </li>
            ))}
          </ul>
        </CardPane>

        <button className='bg-green-400 ml-auto p-4 block bg-primary rounded-lg' onClick={dumpStrapi}>Generate JSON</button>

          <h4 className='text-xl mt-4'>Results</h4>
          <div className='flex flex-col gap-2 mt-8'>
            {Object.entries(routesJsonMap).map(([route, jsonData]) => (
              <div key={route} className='flex-1 overflow-hidden min-w-[350px]'>
                <div className='bg-card-input p-4 flex align-middle justify-between cursor-pointer' onClick={() => downloadObjectAsJson(jsonData, route)}>
                  {route}
                  <DuplicateIcon />
                </div>
                <JSONPretty className='w-full overflow-scroll max-h-[300px]' data={jsonData} />
              </div>
            ))}
          </div>
      </main>
    </div>
  )
}
