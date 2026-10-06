import { CostEstimate } from "../components/ui/cost-estimate";
import { docs, Grp } from "./meta.jsx";

export default { title: "Components/Cost estimate", component: CostEstimate, parameters: { docs: { description: { component: docs("cost-estimate") } } } };

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Plan pays most of the cost"><div style={{ maxWidth: 520 }}>
    <CostEstimate service="MRI of the knee" youPay={180} planPays={1020} detailsHref="#"
      assumptions="This is an estimate for an in-network imaging center. Your cost may change." /></div></Grp>
  <Grp label="You pay the full cost before your deductible is met"><div style={{ maxWidth: 520 }}>
    <CostEstimate service="Physical therapy visit" youPay={95} planPays={0} onDetails={() => {}}
      assumptions="This is an estimate. You have not met your deductible yet, so you pay the full price for now." /></div></Grp>
  <Grp label="Plan pays it all"><div style={{ maxWidth: 520 }}>
    <CostEstimate service="Yearly checkup" youPay={0} planPays={240}
      assumptions="This is an estimate. Your yearly checkup is free when you see a doctor in your network." /></div></Grp>
</>) };
