const { serveHTTP } = require("stremio-addon-sdk");

const addonInterface = require("./addon");

const PORT = process.env.PORT || 7000;

serveHTTP(addonInterface, {
  port: PORT,
  host: "0.0.0.0"
});

console.log("YanHH3D addon running on port " + PORT);
