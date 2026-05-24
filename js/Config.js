/* ================= CONFIG ================= */

const BASE = 'https://giss2.pea.co.th/arcgis/rest/services/PEA_FOR_EXPORT/MapServer';

const LAYER_LINE = 19;
const LAYER_CB = 11;
const LAYER_SWITCH = 16;
const LAYER_RECLOSER = 14;

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyM9trTrp0McGhOdBazbuyXgXDqEDTt8R9LbS3NvUEDlZT0AUR5AZSlHkoWYOnR6b6-YQ/exec';

const SNAP_TOLERANCE_M = 3.0;
const NODE_TOLERANCE_M = 1.0;

const CONDUCTOR_PARAM = {
  'PIC_185': { r: 0.164, x: 0.390 },
  'PIC_95':  { r: 0.320, x: 0.410 },
  'PIC_50':  { r: 0.641, x: 0.430 },
  'ACSR_185':{ r: 0.164, x: 0.390 },
  'ACSR_95': { r: 0.320, x: 0.410 },
  'AAC_95':  { r: 0.320, x: 0.410 },
  'DEFAULT': { r: 0.320, x: 0.410 }
};

const FUSE_K = [6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 65, 80, 100, 140, 200];

const FUSE_COORD_TABLE = {
  6:   {10:190,12:350,15:510,20:650,25:840,30:1060,40:1340,50:1700,65:2200,80:2800,100:3900,140:5800,200:9200},
  8:   {12:210,15:440,20:650,25:840,30:1060,40:1340,50:1700,65:2200,80:2800,100:3900,140:5800,200:9200},
  10:  {15:300,20:540,25:840,30:1060,40:1340,50:1700,65:2200,80:2800,100:3900,140:5800,200:9200},
  12:  {20:320,25:710,30:1050,40:1340,50:1700,65:2200,80:2800,100:3900,140:5800,200:9200},
  15:  {25:430,30:870,40:1340,50:1700,65:2200,80:2800,100:3900,140:5800,200:9200},
  20:  {30:500,40:1100,50:1700,65:2200,80:2800,100:3900,140:5800,200:9200},
  25:  {40:660,50:1350,65:2200,80:2800,100:3900,140:5800,200:9200},
  30:  {50:850,65:1700,80:2800,100:3900,140:5800,200:9200},
  40:  {65:1100,80:2200,100:3900,140:5800,200:9200},
  50:  {80:1450,100:3500,140:5800,200:9200},
  65:  {100:2400,140:5800,200:9200},
  80:  {140:4500,200:9200},
  100: {140:2000,200:9100},
  140: {200:4000}
};
let map;

let lineLayer;
let cbLayer;
let swLayer;
let rcLayer;
let trackLayer;

let lineGeojson;
let cbGeojson;
let swGeojson;
let rcGeojson;

let selectedDevice = null;
let selectedMarker = null;

let graph = {
  nodes: new Map(),
  adj: new Map(),
  edges: []
};
/* ================= GLOBAL STATE ================= */

let map;
let lineLayer, cbLayer, swLayer, rcLayer, trackLayer;
let lineGeojson, cbGeojson, swGeojson, rcGeojson;

let selectedDevice = null;
let selectedMarker = null;

let graph = {
  nodes: new Map(),
  adj: new Map(),
  edges: []
};
