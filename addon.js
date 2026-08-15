const { addonBuilder } = require("stremio-addon-sdk");

const manifest = {
  id: "vn.yanhh3d.addon",
  version: "1.0.0",
  name: "YanHH3D",
  description: "YanHH3D Stremio Addon",
  resources: ["catalog", "meta", "stream"],
  types: ["series", "movie"],
  catalogs: [
    {
      type: "series",
      id: "yanhh3d",
      name: "YanHH3D"
    }
  ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async () => {
  return {
    metas: []
  };
});

builder.defineMetaHandler(async ({ id, type }) => {
  return {
    meta: {
      id,
      type,
      name: "YanHH3D"
    }
  };
});

builder.defineStreamHandler(async () => {
  return {
    streams: []
  };
});

module.exports = builder.getInterface();
