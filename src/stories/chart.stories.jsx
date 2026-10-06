import { BarChart, LineChart } from "../components/ui/chart";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Chart",
  component: BarChart,
  parameters: { docs: { description: { component: docs("chart") } } },
};

const costs = [{ label: "Apr", value: 120 }, { label: "May", value: 86 }, { label: "Jun", value: 142 }, { label: "Jul", value: 64 }, { label: "Aug", value: 38 }, { label: "Sep", value: 52 }];
const steps = [{ label: "Apr", value: 4200 }, { label: "May", value: 4800 }, { label: "Jun", value: 5600 }, { label: "Jul", value: 6100 }, { label: "Aug", value: 5900 }, { label: "Sep", value: 6800 }];
const lastYear = [{ label: "Apr", value: 3900 }, { label: "May", value: 4100 }, { label: "Jun", value: 4300 }, { label: "Jul", value: 4600 }, { label: "Aug", value: 4400 }, { label: "Sep", value: 4700 }];
const usd = (v) => `$${v}`;
const num = (v) => v.toLocaleString("en-US");

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ maxWidth: 520 }}>
  <Grp label="Bar chart (number labels from the Brand Console)"><BarChart title="Your costs went down this summer" summary="This shows what you paid each month, from April to September." data={costs} format={usd} valueName="What you paid" /></Grp>
  <Grp label="Bar chart with a number on every bar"><BarChart labels="all" title="Your costs went down this summer" summary="This shows what you paid each month, from April to September." data={costs} format={usd} valueName="What you paid" /></Grp>
  <Grp label="Line chart with a comparison line"><LineChart title="You walked more this year" summary="This shows your average steps each day, by month." data={steps} compare={{ name: "Last year", data: lastYear }} format={num} valueName="This year" /></Grp>
  <Grp label="Line chart, one line"><LineChart title="You walked more each month" summary="This shows your average steps each day, by month." data={steps} format={num} valueName="Steps each day" /></Grp>
</div>) };
