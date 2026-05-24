/* ================= GRAPH ================= */

function buildGraphFromLines(){
  graph = {
    nodes:new Map(),
    adj:new Map(),
    edges:[]
  };

  lineGeojson.features.forEach((f,idx)=>{
    const geom = f.geometry;
    if(!geom) return;

    const lines = geom.type === 'MultiLineString'
      ? geom.coordinates
      : [geom.coordinates];

    lines.forEach(coords=>{
      for(let i=0;i<coords.length-1;i++){
        const a = coords[i];
        const b = coords[i+1];

        const aId = getNodeId(a);
        const bId = getNodeId(b);

        const distM = distanceMeters(a,b);

        const edge = {
          id: graph.edges.length,
          a:aId,
          b:bId,
          aCoord:a,
          bCoord:b,
          distM,
          feature:f,
          lineIndex:idx
        };

        graph.edges.push(edge);

        addAdj(aId,bId,edge);
        addAdj(bId,aId,edge);
      }
    });
  });
}

function getNodeId(coord){
  const key = roundedCoordKey(coord, NODE_TOLERANCE_M);

  if(!graph.nodes.has(key)){
    graph.nodes.set(key,{
      id:key,
      coord
    });
  }

  if(!graph.adj.has(key)){
    graph.adj.set(key,[]);
  }

  return key;
}

function roundedCoordKey(coord,tolM){
  const lat = coord[1];
  const lng = coord[0];

  const deg = tolM / 111320;

  const x = Math.round(lng/deg);
  const y = Math.round(lat/deg);

  return `${x},${y}`;
}

function addAdj(a,b,edge){
  if(!graph.adj.has(a)){
    graph.adj.set(a,[]);
  }

  graph.adj.get(a).push({
    to:b,
    edge
  });
}

function findBestCbByTopology(startNode, feeder){
  const candidates = [];

  cbGeojson.features.forEach(f => {
    const ll = featurePointLatLng(f);
    if(!ll) return;

    const p = f.properties || {};
    const fid = String(p.FEEDERID || '').toUpperCase();

    if(feeder && !fid.startsWith(feeder.toUpperCase())) return;

    const snap = findNearestEdgeToLatLng(ll);
    if(!snap) return;

    const node = nearestEdgeEndNode(snap.edge, ll);

    candidates.push({
      type: 'CB',
      feature: f,
      latlng: ll,
      node,
      snap
    });
  });

  if(candidates.length === 0){
    return null;
  }

  const all = dijkstraAll(startNode);

  let best = null;

  candidates.forEach(device => {
    const d = all.dist.get(device.node);

    if(d === undefined || !isFinite(d)) return;

    const path = rebuildPathFromDijkstra(
      startNode,
      device.node,
      all
    );

    if(!path) return;

    const item = {
      type: 'CB',
      device,
      path
    };

    if(!best || path.distanceM < best.path.distanceM){
      best = item;
    }
  });

  return best;
}

function dijkstraAll(start){
  const dist = new Map();
  const prev = new Map();
  const prevEdge = new Map();
  const visited = new Set();

  dist.set(start,0);

  while(true){
    let u = null;
    let best = Infinity;

    for(const [node,d] of dist.entries()){
      if(!visited.has(node) && d < best){
        best = d;
        u = node;
      }
    }

    if(u === null) break;

    visited.add(u);

    const neighbors = graph.adj.get(u) || [];

    neighbors.forEach(n => {
      const alt = dist.get(u) + n.edge.distM;

      if(alt < (dist.get(n.to) ?? Infinity)){
        dist.set(n.to, alt);
        prev.set(n.to, u);
        prevEdge.set(n.to, n.edge);
      }
    });
  }

  return {
    dist,
    prev,
    prevEdge
  };
}

function rebuildPathFromDijkstra(start,target,data){
  if(!data.dist.has(target)){
    return null;
  }

  const edges = [];
  let cur = target;

  while(cur !== start){
    const e = data.prevEdge.get(cur);
    const p = data.prev.get(cur);

    if(!e || !p){
      return null;
    }

    edges.push(e);
    cur = p;
  }

  edges.reverse();

  return {
    distanceM:data.dist.get(target),
    edges
  };
}

function getFeatureFeeder(f){
  const p = f.properties || {};
  return p.FEEDERID || p.FEEDER || '';
}

function featurePointLatLng(f){
  if(!f.geometry) return null;

  if(f.geometry.type === 'Point'){
    return L.latLng(
      f.geometry.coordinates[1],
      f.geometry.coordinates[0]
    );
  }

  return null;
}

function findNearestEdgeToLatLng(latlng){
  let best = null;
  const p = [latlng.lng, latlng.lat];

  graph.edges.forEach(edge=>{
    const d = pointToSegmentDistanceMeters(
      p,
      edge.aCoord,
      edge.bCoord
    );

    if(!best || d < best.distanceM){
      best = {
        edge,
        distanceM:d
      };
    }
  });

  return best;
}

function nearestEdgeEndNode(edge,latlng){
  const p = [latlng.lng, latlng.lat];

  const da = distanceMeters(p, edge.aCoord);
  const db = distanceMeters(p, edge.bCoord);

  return da <= db ? edge.a : edge.b;
}

/* ================= GEOMETRY ================= */

function distanceMeters(a,b){
  const lat1 = a[1] * Math.PI/180;
  const lat2 = b[1] * Math.PI/180;
  const dLat = (b[1]-a[1]) * Math.PI/180;
  const dLng = (b[0]-a[0]) * Math.PI/180;

  const R = 6371000;

  const x =
    Math.sin(dLat/2)**2 +
    Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;

  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function pointToSegmentDistanceMeters(p,a,b){
  const lat = p[1] * Math.PI/180;

  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(lat);

  const px = p[0]*mPerDegLng;
  const py = p[1]*mPerDegLat;
  const ax = a[0]*mPerDegLng;
  const ay = a[1]*mPerDegLat;
  const bx = b[0]*mPerDegLng;
  const by = b[1]*mPerDegLat;

  const dx = bx-ax;
  const dy = by-ay;

  if(dx===0 && dy===0){
    return Math.hypot(px-ax,py-ay);
  }

  let t =
    ((px-ax)*dx + (py-ay)*dy) /
    (dx*dx + dy*dy);

  t = Math.max(0,Math.min(1,t));

  const cx = ax + t*dx;
  const cy = ay + t*dy;

  return Math.hypot(px-cx,py-cy);
}
