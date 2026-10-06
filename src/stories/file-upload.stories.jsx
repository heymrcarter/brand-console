import { FileUpload } from "../components/ui/file-upload";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/File upload",
  component: FileUpload,
  parameters: { docs: { description: { component: docs("file-upload") } } },
};

const sample = [
  { key: "a", name: "bill-march.pdf", size: 1258291, status: "Uploaded" },
  { key: "b", name: "letter.jpg", size: 845000, progress: 60 },
];

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (
  <div style={{ display: "grid", gap: "calc(var(--gap)*2)", maxWidth: 560 }}>
    <Grp label="Drop area and button">
      <FileUpload style="drop" label="Add your bill" accept=".pdf,.jpg,.jpeg,.png" maxSize={10} />
    </Grp>
    <Grp label="Button only">
      <FileUpload style="button" label="Add a letter from your doctor" hint="PDF, JPG, or PNG. Up to 10 MB each. On a phone, you can take a photo." accept=".pdf,.jpg,.jpeg,.png,image/*" maxSize={10} />
    </Grp>
    <Grp label="With files, one still uploading">
      <FileUpload label="Add your bill" files={sample} />
    </Grp>
    <Grp label="With an error">
      <FileUpload style="button" label="Add your bill" error="Add a photo or PDF of your bill before you go on." />
    </Grp>
  </div>
) };
