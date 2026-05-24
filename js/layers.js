/* ================= LOAD DATA ================= */

async function loadAll(){
  showLoading();

  try{
    resetAll();

    const feeder = document
      .getElementById('feederPrefix')
      .value
      .trim()
      .toUpperCase();

    if(!feeder){
      throw new Error('กรุณาระบุ Feeder Prefix เช่น QSA, PPB, NTA');
    }

    const where = `FEEDERID LIKE '${feeder}%'`;

    const lineFields =
      'OBJECTID,TAG,FEEDERID,OP_VOLT,CONDUCTORTYPE,CONDUCTORSIZE,IMPEDANCE,MAINORLATERAL,MEASURELENGTH,ENABLED,ELECTRICTRACEWEIGHT';

    const cbFields =
      'OBJECTID,TAG,FEEDERID,FACILITYID,OP_VOLT,PRESENTPOSITION,NORMALSTATUS,ENABLED,LOCATION,SHORTCIRCUITBREAKINGCURRENT,MAXCONTINUOUSCURRENT';

    const swFields =
      'OBJECTID,TAG,FEEDERID,FACILITYID,OP_VOLT,SUBTYPECODE,PRESENTPOSITION,NORMALSTATUS,ENABLED,MAXINTERRUPTINGCURRENT,MAXCONTINUOUSCURRENT,LOCATION';

    const rcFields =
      'OBJECTID,TAG,FEEDERID,FACILITYID,OP_VOLT,NORMALPOSITION,ENABLED,LOCATION,MAXINTERRUPTINGCURRENT,MAXCONTINUOUSCURRENT';

    setStatus('กำลังโหลดสายไฟ...');
    lineGeojson = await queryLayerGeojson(LAYER_LINE, where, lineFields);

    setStatus('กำลังโหลด Circuit Breaker...');
    cbGeojson = await queryLayerGeojson(LAYER_CB, where, cbFields);

    setStatus('กำลังโหลด Switch/Fuse...');
    swGeojson = await queryLayerGeojson(LAYER_SWITCH, where, swFields);

    setStatus('กำลังโหลด Recloser...');
    rcGeojson = await queryLayerGeojson(LAYER_RECLOSER, where, rcFields);

    drawLines();
    drawCB();
    drawSwitches();
    drawRecloser();

    buildGraphFromLines();

    fitAll();

    setStatus(
      `โหลดสำเร็จ ${feeder}: ` +
      `สาย ${lineGeojson.features.length} เส้น, ` +
      `CB ${cbGeojson.features.length} จุด, ` +
      `Switch/Fuse ${swGeojson.features.length} จุด, ` +
      `Recloser ${rcGeojson.features.length} จุด`
    );

  }catch(err){
    console.error(err);
    setStatus('Error: ' + err.message);
    alert(err.message);
  }finally{
    hideLoading();
  }
}

async function queryLayerGeojson(layerId, where, outFields){
  const url = `${BASE}/${layerId}/query?` + new URLSearchParams({
    where,
    outFields,
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson'
  });

  const res = await fetch(url);

  if(!res.ok){
    throw new Error(`Layer ${layerId} HTTP ${res.status}`);
  }

  const data = await res.json();

  if(!data.features){
    throw new Error(`Layer ${layerId} ไม่พบ features`);
  }

  return data;
}

/* ================= DRAW LAYERS ================= */

function drawLines(){
  lineLayer = L.geoJSON(lineGeojson,{
    style:f=>({
      color:getLineColor(f.properties),
      weight:getLineWeight(f.properties),
      opacity:.9
    }),
    onEachFeature:(f,l)=>{
      const p = f.properties || {};
      l.bindPopup(`
        <b>LINE</b><br>
        TAG: ${p.TAG || '-'}<br>
        FEEDERID: ${p.FEEDERID || '-'}<br>
        CONDUCTOR: ${p.CONDUCTORTYPE || '-'} ${p.CONDUCTORSIZE || ''}<br>
        IMPEDANCE: ${p.IMPEDANCE || '-'}<br>
        MAIN/LATERAL: ${p.MAINORLATERAL || '-'}<br>
        LENGTH: ${p.MEASURELENGTH || '-'}
      `);
    }
  }).addTo(map);
}

function drawCB(){
  cbLayer = L.geoJSON(cbGeojson,{
    pointToLayer:(f,latlng)=>L.circleMarker(latlng,{
      radius:7,
      color:'#111827',
      fillColor:'#facc15',
      fillOpacity:1,
      weight:2
    }),
    onEachFeature:(f,l)=>{
      const p = f.properties || {};
      l.bindPopup(`
        <b>CB</b><br>
        TAG: ${p.TAG || '-'}<br>
        FACILITYID: ${p.FACILITYID || '-'}<br>
        FEEDERID: ${p.FEEDERID || '-'}<br>
        LOCATION: ${p.LOCATION || '-'}<br>
        SC BREAKING: ${p.SHORTCIRCUITBREAKINGCURRENT || '-'}<br>
        MAX CONT: ${p.MAXCONTINUOUSCURRENT || '-'} A
      `);
    }
  }).addTo(map);
}

function drawSwitches(){
  swLayer = L.geoJSON(swGeojson,{
    pointToLayer:(f,latlng)=>L.circleMarker(latlng,{
      radius:5,
      color:'#7c2d12',
      fillColor:'#fb923c',
      fillOpacity:.95,
      weight:1
    }),
    onEachFeature:(f,l)=>{
      const p = f.properties || {};

      l.on('click',()=>{
        selectDevice(f,l.getLatLng());
      });

      l.bindPopup(`
        <b>Switch / Fuse / DF</b><br>
        TAG: ${p.TAG || '-'}<br>
        FACILITYID: ${p.FACILITYID || '-'}<br>
        FEEDERID: ${p.FEEDERID || '-'}<br>
        LOCATION: ${p.LOCATION || '-'}<br>
        MAX SC: ${p.MAXINTERRUPTINGCURRENT || '-'} kA<br>
        MAX CONT: ${p.MAXCONTINUOUSCURRENT || '-'} A<br>
        <hr>
        <button onclick="trackSelectedDevice()" style="padding:6px 10px;border:none;border-radius:8px;background:#6d28d9;color:white;">
          Track + Fault
        </button>
      `);
    }
  }).addTo(map);
}

function drawRecloser(){
  rcLayer = L.geoJSON(rcGeojson,{
    pointToLayer:(f,latlng)=>L.circleMarker(latlng,{
      radius:8,
      color:'#991b1b',
      fillColor:'#ef4444',
      fillOpacity:1,
      weight:2
    }),
    onEachFeature:(f,l)=>{
      const p = f.properties || {};
      l.bindPopup(`
        <b>RECLOSER</b><br>
        TAG: ${p.TAG || '-'}<br>
        FACILITYID: ${p.FACILITYID || '-'}<br>
        FEEDERID: ${p.FEEDERID || '-'}<br>
        LOCATION: ${p.LOCATION || '-'}<br>
        MAX SC: ${p.MAXINTERRUPTINGCURRENT || '-'} kA<br>
        MAX CONT: ${p.MAXCONTINUOUSCURRENT || '-'} A
      `);
    }
  }).addTo(map);
}

function getLineColor(p){
  const t = String(p.CONDUCTORTYPE || '').toUpperCase();

  if(t.includes('PIC')) return '#7c3aed';
  if(t.includes('ACSR')) return '#dc2626';
  if(t.includes('AAC')) return '#16a34a';
  if(t.includes('SAC')) return '#2563eb';

  return '#111827';
}

function getLineWeight(p){
  return String(p.MAINORLATERAL || '').toUpperCase() === 'M' ? 4 : 2;
}

function fitAll(){
  const layers = [
    lineLayer,
    cbLayer,
    swLayer,
    rcLayer
  ].filter(Boolean);

  if(layers.length === 0) return;

  const group = L.featureGroup(layers);

  if(group.getBounds().isValid()){
    map.fitBounds(group.getBounds(),{padding:[20,20]});
  }
}

/* ================= SELECT DEVICE ================= */

function selectDevice(feature, latlng){
  selectedDevice = {
    feature,
    latlng
  };

  if(selectedMarker){
    map.removeLayer(selectedMarker);
  }

  selectedMarker = L.circleMarker(latlng,{
    radius:10,
    color:'#f97316',
    fillColor:'#fff7ed',
    fillOpacity:.9,
    weight:3
  }).addTo(map);

  selectedMarker.bindPopup('เลือกอุปกรณ์นี้สำหรับ Track').openPopup();

  setStatus('เลือก Switch/Fuse แล้ว กด Track + คำนวณ Fault');
}
