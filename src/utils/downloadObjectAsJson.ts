export const getUrlToJson = (exportObj: unknown) => {
  return (
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(exportObj))
  );
};

export function downloadObjectAsJson(exportObj: unknown, exportName: string) {
  const dataStr = getUrlToJson(exportObj);
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
