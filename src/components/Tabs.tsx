import clsx from "clsx";
import React, { ReactNode, useContext, useState } from "react";

type Ctx = {
  selectedTab: string | undefined;
  setSelectedTab: (selectedTabId: string | undefined) => void;
};
const defaultState: Ctx = { selectedTab: undefined, setSelectedTab: () => {} };
const Context = React.createContext(defaultState);

const useTabsContext = () => {
  const ctx = useContext(Context);

  if (!ctx) throw new Error("Implementation is not correct");

  return ctx;
};

type MenuProps = {
  children: ReactNode;
};
const Tabs = ({ children }: MenuProps) => {
  const [selectedTab, setSelectedTab] = useState<string>();
  return (
    <Context.Provider value={{ selectedTab, setSelectedTab }}>
      {children}
    </Context.Provider>
  );
};

type GroupsProps = {
  children: ReactNode;
};
const Container = ({ children }: GroupsProps) => (
  <ul
    className="nav nav-tabs flex flex-col md:flex-row flex-wrap list-none border-b-0 pl-0 mb-4"
    id="tabs-tab"
    role="tablist"
  >
    {children}
  </ul>
);

type TitleProps = {
  disabled?: boolean;
  children: string;
  id: string;
};
const Tab = ({ disabled, children, id }: TitleProps) => {
  const { selectedTab, setSelectedTab } = useTabsContext();
  return (
    <li className="nav-item" role="presentation">
      <a
        href={`#${id}`}
        className={clsx(
          `
      block
      font-medium
      tracking-wider
      text-sm
      leading-tight
      border-x-0 border-t-0 border-b-2 border-transparent
      px-6
      py-3
      my-2
      hover:border-transparent
      hover:bg-black
      hover:bg-opacity-10
      `,
          {
            disabled,
            [`
            border-primary hover:border-primary
            text-primary
          `]: selectedTab === id,
          }
        )}
        id={id}
        data-bs-toggle="pill"
        data-bs-target={`#${id}`}
        role="tab"
        aria-controls={id}
        aria-selected="true"
        onClick={() => setSelectedTab(id)}
      >
        {children}
      </a>
    </li>
  );
};

type ContentProps = {
  children: ReactNode;
};
const Content = ({ children }: ContentProps) => {
  return (
    <div className="tab-content" id="tabs-tabContent">
      {children}
    </div>
  );
};

type ItemProps = {
  children: ReactNode;
  id: string;
};
const Item = ({ children, id }: ItemProps) => {
  const { selectedTab } = useTabsContext();
  return (
    <div
      className={clsx("tab-pane fade show", {
        active: selectedTab === id,
      })}
      id={id}
      role="tabpanel"
      aria-labelledby={id}
    >
      {children}
    </div>
  );
};

export default Tabs;
Tabs.Container = Container;
Tabs.Tab = Tab;
Tabs.Content = Content;
Tabs.Item = Item;
