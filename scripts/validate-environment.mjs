const minimumNode = [22, 13, 0];
const currentNode = process.versions.node.split(".").map(Number);
const nodeIsSupported = (() => {
  for (let index = 0; index < minimumNode.length; index += 1) {
    if (currentNode[index] > minimumNode[index]) return true;
    if (currentNode[index] < minimumNode[index]) return false;
  }
  return true;
})();

if (!nodeIsSupported) {
  throw new Error(
    `Node ${minimumNode.join(".")} or newer is required; found ${process.versions.node}.`,
  );
}

const exposedSecretNames = Object.keys(process.env).filter(
  (name) =>
    name.startsWith("NEXT_PUBLIC_") &&
    /(?:SECRET|TOKEN|PASSWORD|PRIVATE|API_KEY)/i.test(name),
);
if (exposedSecretNames.length > 0) {
  throw new Error(
    `Potential secret names must not use NEXT_PUBLIC_: ${exposedSecretNames.join(", ")}`,
  );
}

console.log(
  `Environment validation passed on Node ${process.versions.node}; Atlas requires no runtime secrets.`,
);
