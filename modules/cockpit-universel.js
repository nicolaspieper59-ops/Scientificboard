export function activate(container) {
  const el = {
    vitesse: container.querySelector('#vitesse-kmh'),
    max: container.querySelector('#vitesse-max'),
    moy: container.querySelector('#vitesse-moy'),
    dist: container.querySelector('#distance'),
    alt: container.querySelector('#altitude'),
    gps: container.querySelector('#gps-precision'),
    mode: container.querySelector('#mode-souterrain'),
    solaire: container.querySelector('#heure-solaire'),
    moyen: container.querySelector('#temps-moyen'),
    toggle: container.querySelector('#toggle'),
    reset: container.querySelector('#reset')
  };

  let totalDistance = 0, totalSpeed = 0, count = 0, maxSpeed = 0;
  let lastPos = null;
  let watchId = null;
  let gpsActive = true;

  function updateHeureSolaire(longitude = 5.3) {
    const now = new Date();
    const correction = longitude * 4 / 60;
    const heureSolaire = (now.getUTCHours() + correction).toFixed(2);
    el.solaire.textContent = `🌞 Heure solaire locale : ${heureSolaire} h`;
  }

  function updateTempsMoyen() {
    const now = new Date();
    el.moyen.textContent = `🧭 Temps moyen UTC : ${now.toISOString().slice(11, 19)}`;
  }

  function updateDisplay(pos) {
    const { latitude, longitude, speed, altitude, accuracy } = pos.coords;
    const kmh = speed ? speed * 3.6 : 0;

    el.vitesse.textContent = `🚀 Vitesse : ${kmh.toFixed(1)} km/h`;
    maxSpeed = Math.max(maxSpeed, kmh);
    el.max.textContent = `📈 Max : ${maxSpeed.toFixed(1)} km/h`;
    totalSpeed += kmh;
    count++;
    el.moy.textContent = `📊 Moyenne : ${(totalSpeed / count).toFixed(1)} km/h`;
    el.alt.textContent = `🗻 Altitude : ${altitude?.toFixed(1) || '...'} m`;
    el.gps.textContent = `🎯 Précision : ±${accuracy.toFixed(1)} m`;

    if (lastPos && accuracy < 100) {
      const dx = Math.sqrt(
        Math.pow(latitude - lastPos.latitude, 2) +
        Math.pow(longitude - lastPos.longitude, 2)
      ) * 111000;
      if (dx > accuracy) {
        totalDistance += dx;
        el.dist.textContent = `📏 Distance : ${totalDistance.toFixed(1)} m`;
      }
    }

    lastPos = { latitude, longitude };
    el.mode.textContent = accuracy > 100 || kmh === 0
      ? "🕳️ Souterrain ou GPS faible"
      : "🌍 GPS actif";
    el.mode.style.color = accuracy > 100 || kmh === 0 ? "gray" : "lime";

    updateHeureSolaire(longitude);
    updateTempsMoyen();
  }

  function startGPS() {
    if (!watchId) {
      watchId = navigator.geolocation.watchPosition(updateDisplay, err => {
        el.mode.textContent = "🚫 GPS indisponible";
        el.mode.style.color = "gray";
      }, { enableHighAccuracy: true });
    }
  }

  function stopGPS() {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      el.mode.textContent = "⏸️ GPS désactivé";
      el.mode.style.color = "gray";
    }
  }

  el.toggle.onclick = () => {
    gpsActive = !gpsActive;
    el.toggle.textContent = gpsActive ? "🟢 Marche" : "🔴 Arrêt";
    gpsActive ? startGPS() : stopGPS();
  };

  el.reset.onclick = () => {
    totalDistance = 0;
    totalSpeed = 0;
    count = 0;
    maxSpeed = 0;
    el.vitesse.textContent = "🚀 Vitesse : ...";
    el.max.textContent = "📈 Max : ...";
    el.moy.textContent = "📊 Moyenne : ...";
    el.dist.textContent = "📏 Distance : ...";
  };

  startGPS();
  setInterval(() => {
    updateTempsMoyen();
    if (lastPos) updateHeureSolaire(lastPos.longitude);
  }, 10000);
}
