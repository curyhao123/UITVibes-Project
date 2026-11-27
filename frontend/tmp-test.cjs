const React = require("react");
const ReactDOMServer = require("react-dom/server");

const captured = [];
const origError = console.error;
console.error = (...args) => {
  captured.push(args.map((a) => (typeof a === "string" ? a : String(a))).join(" "));
};

function run(label, props) {
  captured.length = 0;
  ReactDOMServer.renderToStaticMarkup(React.createElement("circle", { cx: 1, cy: 2, r: 3, ...props }));
  const hits = captured.filter((e) => /event handler|Invalid value for prop/.test(e));
  origError(`${label} -> ${hits.length ? hits.join(" | ") : "NO WARNING"}`);
}

run("A function  ", { onPressIn: () => {} });
run("B undefined ", { onPressIn: undefined });
run("C null      ", { onPressIn: null });
run("D absent    ", {});
run("E onClick   ", { onClick: () => {} });

origError("");
origError("react-dom/server build:", require("react-dom/server/package.json").version);
