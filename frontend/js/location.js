const AtLocation = (() => {
  let data = null; // { locations, cities }
  let current = JSON.parse(localStorage.getItem('atprice_location') || 'null');

  async function ensureData() {
    if (!data) data = await Api.locations();
    return data;
  }

  function getCurrent() {
    return current;
  }

  function save(loc) {
    current = loc;
    localStorage.setItem('atprice_location', JSON.stringify(loc));
    const label = document.getElementById('currentLoc');
    if (label) label.textContent = `${loc.city}, ${loc.district}`;
    document.dispatchEvent(new CustomEvent('atprice:location-changed', { detail: loc }));
  }

  async function openModal() {
    await ensureData();
    const body = document.getElementById('modalBody');
    body.innerHTML = `
      <button class="close" onclick="closeModal()">✕</button>
      <h2>Choose your shopping location</h2>
      <div class="notice">AtPrice uses this to show relevant nearby shops and real, calculated distances. We never access your precise location without your permission.</div>
      <div class="location-grid">
        <label>Country<select id="loc-country"></select></label>
        <label>State<select id="loc-state"></select></label>
        <label>District<select id="loc-district"></select></label>
        <label>City / Locality<select id="loc-city"></select></label>
      </div>
      <br>
      <button class="btn" id="loc-save-btn">Save location</button>
      <button class="btn outline" id="loc-geo-btn" style="margin-top:8px">Use my current location (optional)</button>
      <div id="loc-geo-status" class="muted" style="margin-top:8px"></div>
    `;
    document.getElementById('modal').style.display = 'flex';

    const countrySel = document.getElementById('loc-country');
    const stateSel = document.getElementById('loc-state');
    const districtSel = document.getElementById('loc-district');
    const citySel = document.getElementById('loc-city');

    countrySel.innerHTML = Object.keys(data.locations).map((c) => `<option>${c}</option>`).join('');
    const fillStates = () => {
      const states = Object.keys(data.locations[countrySel.value] || {});
      stateSel.innerHTML = states.map((s) => `<option>${s}</option>`).join('');
      fillDistricts();
    };
    const fillDistricts = () => {
      const districts = data.locations[countrySel.value]?.[stateSel.value] || [];
      districtSel.innerHTML = districts.map((d) => `<option>${d}</option>`).join('');
      fillCities();
    };
    const fillCities = () => {
      const list = data.cities[districtSel.value] || [`${districtSel.value} City Centre`, `${districtSel.value} Town`, 'Other locality'];
      citySel.innerHTML = list.map((c) => `<option>${c}</option>`).join('');
    };

    countrySel.onchange = fillStates;
    stateSel.onchange = fillDistricts;
    districtSel.onchange = fillCities;
    fillStates();

    if (current) {
      countrySel.value = current.country || 'India';
      fillStates();
      stateSel.value = current.state;
      fillDistricts();
      districtSel.value = current.district;
      fillCities();
      citySel.value = current.city;
    }

    document.getElementById('loc-save-btn').onclick = () => {
      save({
        country: countrySel.value,
        state: stateSel.value,
        district: districtSel.value,
        city: citySel.value,
      });
      closeModal();
    };

    document.getElementById('loc-geo-btn').onclick = () => {
      const status = document.getElementById('loc-geo-status');
      if (!navigator.geolocation) {
        status.textContent = 'Geolocation is not available in this browser.';
        return;
      }
      status.textContent = 'Requesting permission…';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            country: countrySel.value, state: stateSel.value, district: districtSel.value, city: citySel.value,
            lat: pos.coords.latitude, lng: pos.coords.longitude,
          };
          save(loc);
          status.textContent = 'Location captured for accurate distances.';
          closeModal();
        },
        () => { status.textContent = 'Permission denied — you can still pick a location manually above.'; },
        { timeout: 8000 }
      );
    };
  }

  return { openModal, getCurrent, save, ensureData };
})();

function openLocation() { AtLocation.openModal(); }
function closeModal() { document.getElementById('modal').style.display = 'none'; }
