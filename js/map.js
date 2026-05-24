/* ================= MAP / UI CORE ================= */

function initMap(){
  map = L.map('map').setView([8.57,99.25],11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:22,
    attribution:'&copy; OpenStreetMap'
  }).addTo(map);
}

function setStatus(msg){
  document.getElementById('status').innerHTML = msg;
}

function showLoading(message = 'กำลังประมวลผล...'){
  const loading = document.getElementById('loading');
  const text = loading.querySelector('.box div:last-child');

  if(text){
    text.textContent = message;
  }

  loading.style.display = 'flex';
}

function hideLoading(){
  document.getElementById('loading').style.display='none';
}

function delayUI(ms = 50){
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resetAll(){
  [
    lineLayer,
    cbLayer,
    swLayer,
    rcLayer,
    trackLayer,
    selectedMarker
  ].forEach(layer => {
    if(layer){
      map.removeLayer(layer);
    }
  });

  lineLayer = null;
  cbLayer = null;
  swLayer = null;
  rcLayer = null;
  trackLayer = null;
  selectedMarker = null;

  lineGeojson = null;
  cbGeojson = null;
  swGeojson = null;
  rcGeojson = null;

  selectedDevice = null;

  graph = {
    nodes: new Map(),
    adj: new Map(),
    edges: []
  };

  document.getElementById('resultBox').textContent = '-';
  setStatus('Reset ทั้งหมดแล้ว');
}

function clearTrack(){
  if(trackLayer){
    map.removeLayer(trackLayer);
  }

  if(selectedMarker){
    map.removeLayer(selectedMarker);
  }

  trackLayer = null;
  selectedMarker = null;
  selectedDevice = null;

  document.getElementById('resultBox').textContent = '-';
  setStatus('ล้าง Track แล้ว');
}

initMap();
