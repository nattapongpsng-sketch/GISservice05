/* ================= API ================= */

async function callFaultApi(payload){
  const res = await fetch(GAS_API_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if(!data.ok){
    throw new Error(data.error || 'Apps Script API error');
  }

  return data;
}
