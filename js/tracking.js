/* ================= TRACK ================= */

async function trackSelectedDevice(){
  if(!selectedDevice){
    alert('กรุณาคลิกเลือก Switch/Fuse/DF บนแผนที่ก่อน');
    return;
  }

  if(!lineGeojson || !cbGeojson){
    alert('กรุณาโหลดข้อมูลก่อน');
    return;
  }

  showLoading('กำลัง Track เส้นทางและคำนวณกระแสลัดวงจร...');
  await delayUI();

  try{
    console.time('TRACK_TOTAL');

    clearOnlyTrackLayer();

    console.time('START_SNAP');

    const startSnap =
      findNearestEdgeToLatLng(selectedDevice.latlng);

    console.timeEnd('START_SNAP');

    if(!startSnap || startSnap.distanceM > SNAP_TOLERANCE_M){
      throw new Error(
        `หาเส้นใกล้ DF/Fuse ไม่พบ ระยะใกล้สุด ${
          startSnap
            ? startSnap.distanceM.toFixed(2)
            : '-'
        } m`
      );
    }

    const startNode =
      nearestEdgeEndNode(
        startSnap.edge,
        selectedDevice.latlng
      );

    const feeder =
      getFeatureFeeder(startSnap.edge.feature);

    console.time('FIND_CB');

    const best =
      findBestCbByTopology(
        startNode,
        feeder
      );

    console.timeEnd('FIND_CB');

    if(!best){
      throw new Error(
        'ไม่พบ CB ที่เชื่อมต่อกับโครงข่ายนี้'
      );
    }

    console.time('DRAW_TRACK');

    drawTrack(best.path.edges);

    console.timeEnd('DRAW_TRACK');

    console.time('FAULT_LOCAL');

    const fault =
      calculateFault(best.path.edges);

    const conductorSummary =
      summarizeConductors(best.path.edges);

    console.timeEnd('FAULT_LOCAL');

    const apiPayload = {
      action: 'fault',

      stationCode:
        feeder.substring(0,3),

      faultType:
        document.getElementById('faultType').value,

      voltageKv:
        Number(
          document.getElementById('voltage').value
        ),

      segments:
        buildApiSegmentsFromEdges(best.path.edges)
    };

    console.time('CALL_GAS');

    let apiResult = null;

    try{
      if(
        typeof GAS_API_URL !== 'undefined'
        &&
        GAS_API_URL
      ){
        showLoading('กำลังส่งข้อมูลไปคำนวณที่ Google Sheet...');
        await delayUI();

        apiResult =
          await callFaultApi(apiPayload);
      }
    }catch(apiErr){
      console.error(
        'GAS API ERROR',
        apiErr
      );
    }

    console.timeEnd('CALL_GAS');

    let showKA =
      fault.ifaultA / 1000;

    if(
      apiResult
      &&
      apiResult.selectedFault
      &&
      apiResult.selectedFault.current_kA
    ){
      showKA =
        apiResult.selectedFault.current_kA;
    }

    const coordResult = checkFuseCoordination(
      document.getElementById('downstreamFuse').value,
      document.getElementById('upstreamFuse').value,
      showKA * 1000
    );

    const result = {
      selectedDevice:
        selectedDevice.feature.properties,

      feeder,

      sourceType: 'CB',

      sourceDevice:
        best.device.feature.properties,

      trackDistance_m:
        best.path.distanceM,

      trackDistance_km:
        best.path.distanceM / 1000,

      edgeCount:
        best.path.edges.length,

      conductorSummary,

      localEstimate: {
        totalLineR_ohm:
          fault.lineR,

        totalLineX_ohm:
          fault.lineX,

        sourceR_ohm:
          fault.sourceR,

        sourceX_ohm:
          fault.sourceX,

        totalR_ohm:
          fault.totalR,

        totalX_ohm:
          fault.totalX,

        zMagnitude_ohm:
          fault.zMag,

        voltage_kV:
          fault.voltageKv,

        faultCurrent_1ph_A:
          fault.ifaultA,

        faultCurrent_1ph_kA:
          fault.ifaultA / 1000
      },

      apiFaultResult:
        apiResult,

      fuseCoordination:
        coordResult
    };

    document.getElementById('resultBox').textContent =
      JSON.stringify(result,null,2);

    const faultTypeText =
      document.getElementById('faultType').value === '3PH'
        ? '3PH'
        : '1PH-G';

    setStatus(
      `Track สำเร็จ ไปยัง CB ` +
      `ระยะ ${(best.path.distanceM/1000).toFixed(3)} km, ` +
      `${faultTypeText} ≈ ${Number(showKA).toFixed(3)} kA, ` +
      `Fuse: ${coordResult.message}`
    );

    console.timeEnd('TRACK_TOTAL');

  }catch(err){
    console.error(err);

    setStatus(
      'Error: ' + err.message
    );

    alert(err.message);

  }finally{
    hideLoading();
  }
}

function clearOnlyTrackLayer(){
  if(trackLayer){
    map.removeLayer(trackLayer);
  }

  trackLayer = null;
}

function drawTrack(edges){
  const features = edges.map(e=>e.feature);
  const unique = [];
  const seen = new Set();

  features.forEach(f=>{
    const id =
      f.properties?.OBJECTID ||
      f.properties?.TAG ||
      JSON.stringify(f.geometry).slice(0,50);

    if(!seen.has(id)){
      seen.add(id);
      unique.push(f);
    }
  });

  trackLayer = L.geoJSON({
    type:'FeatureCollection',
    features:unique
  },{
    style:{
      color:'#84cc16',
      weight:7,
      opacity:0.5
    }
  }).addTo(map);

  if(trackLayer.getBounds().isValid()){
    map.fitBounds(trackLayer.getBounds(),{padding:[30,30]});
  }
}
