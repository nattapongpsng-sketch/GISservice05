/* ================= FAULT CURRENT / FUSE COORDINATION ================= */

function calculateFault(edges){
  const voltageKv = Number(document.getElementById('voltage').value);

  const sourceR = 0;
  const sourceX = 0;

  let lineR = 0;
  let lineX = 0;

  edges.forEach(e=>{
    const p = e.feature.properties || {};
    const lenKm = e.distM / 1000;

    const key = getConductorKey(p);
    const z = CONDUCTOR_PARAM[key] || CONDUCTOR_PARAM.DEFAULT;

    lineR += z.r * lenKm;
    lineX += z.x * lenKm;
  });

  const totalR = sourceR + lineR;
  const totalX = sourceX + lineX;
  const zMag = Math.sqrt(totalR*totalR + totalX*totalX);

  const vPhase = (voltageKv * 1000) / Math.sqrt(3);
  const ifaultA = zMag > 0 ? vPhase / zMag : 0;

  return {
    voltageKv,
    sourceR,
    sourceX,
    lineR,
    lineX,
    totalR,
    totalX,
    zMag,
    ifaultA
  };
}

function buildApiSegmentsFromEdges(edges){
  const map = new Map();

  edges.forEach(e => {
    const p = e.feature.properties || {};

    const conductorType =
      String(p.CONDUCTORTYPE || '')
        .toUpperCase()
        .trim();

    const conductorSize =
      String(p.CONDUCTORSIZE || '')
        .trim();

    const lineType = 'SP';

    const key =
      `${conductorType}|${conductorSize}|${lineType}`;

    const lengthKm =
      e.distM / 1000;

    if(!map.has(key)){
      map.set(key,{
        conductorType,
        conductorSize,
        lineType,
        lengthKm: 0
      });
    }

    map.get(key).lengthKm += lengthKm;
  });

  return Array.from(map.values()).map(s => ({
    ...s,
    lengthKm: Number(s.lengthKm.toFixed(6))
  }));
}

function summarizeConductors(edges){
  const summary = {};

  edges.forEach(e=>{
    const p = e.feature.properties || {};
    const type = String(p.CONDUCTORTYPE || 'UNKNOWN').trim();
    const size = String(p.CONDUCTORSIZE || '').trim();
    const key = `${type} ${size}`.trim();
    const lenKm = e.distM / 1000;

    if(!summary[key]){
      summary[key] = {
        length_km:0,
        count:0
      };
    }

    summary[key].length_km += lenKm;
    summary[key].count += 1;
  });

  Object.keys(summary).forEach(k=>{
    summary[k].length_km =
      Number(summary[k].length_km.toFixed(4));
  });

  return summary;
}

function getConductorKey(p){
  const type = String(p.CONDUCTORTYPE || '').toUpperCase().trim();
  const size = String(p.CONDUCTORSIZE || '').trim();

  if(type.includes('PIC') && size==='185') return 'PIC_185';
  if(type.includes('PIC') && size==='95') return 'PIC_95';
  if(type.includes('PIC') && size==='50') return 'PIC_50';
  if(type.includes('ACSR') && size==='185') return 'ACSR_185';
  if(type.includes('ACSR') && size==='95') return 'ACSR_95';
  if(type.includes('AAC') && size==='95') return 'AAC_95';

  return 'DEFAULT';
}

function checkFuseCoordination(loadFuse, sourceFuse, faultCurrentA){
  const downstream = Number(loadFuse);
  const upstream = Number(sourceFuse);
  const faultA = Number(faultCurrentA);

  const maxCoordA =
    FUSE_COORD_TABLE?.[downstream]?.[upstream];

  if(!maxCoordA){
    return {
      ok: false,
      status: 'NO_TABLE',
      message: `ไม่มีข้อมูล coordination สำหรับ ${downstream}K → ${upstream}K`,
      downstreamFuse: downstream,
      upstreamFuse: upstream,
      faultCurrentA: faultA,
      maxCoordA: null
    };
  }

  const isCoordinate =
    faultA <= maxCoordA;

  return {
    ok: true,
    status: isCoordinate ? 'COORDINATE' : 'NOT_COORDINATE',
    message: isCoordinate
      ? `${downstream}K กับ ${upstream}K ประสานงานกันได้`
      : `${downstream}K กับ ${upstream}K ไม่ประสานงานกัน`,
    downstreamFuse: downstream,
    upstreamFuse: upstream,
    faultCurrentA: faultA,
    maxCoordA,
    marginA: maxCoordA - faultA,
    marginPercent: ((maxCoordA - faultA) / maxCoordA) * 100
  };
}
