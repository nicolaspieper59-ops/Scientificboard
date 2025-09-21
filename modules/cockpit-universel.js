export function activate(container) {
  const el = Object.fromEntries(
    Array.from(container.querySelectorAll('[id]')).map(e => [e.id, e])
  );

  let totalDistance = 0, totalSpeed = 0, count = 0, maxSpeed = 0;
  let lastPos = null;
  let watchId = null;
  let gpsActive = true;

  // ⏱️ Temps solaire
  function updateTemps() {
    const now = new Date();
    const utc = now.toISOString().slice(11, 19);
    el.solarMean.textContent = `🧭 Temps moyen UTC : ${utc}`;

    const longitude = lastPos?.longitude ?? 5.3;
    const correction = longitude * 4 / 60;
    const solar = (now.getUTCHours() + correction).toFixed(2);
    el.solarLocal.textContent = `🌞 Heure solaire locale : ${solar} h`;

    const eqTime = Math.sin((now.getMonth() + 1) / 12 * 2 * Math.PI) * 7.5;
    el.equationTime.textContent = `📐 Équation du temps : ${eqTime.toFixed(1)} s`;
  }

  // 🧭 Orientation & boussole
  window.addEventListener('deviceorientation', e => {
    const cap = e.alpha?.toFixed(1);
    el.compass.textContent = `🧭 Cap : ${cap}°`;
    el.bubbleX.textContent = `🫧 Inclinaison X : ${e.beta?.toFixed(1)}°`;
    el.bubbleY.textContent = `🫧 Inclinaison Y : ${e.gamma?.toFixed(1)}°`;
  });

  // 🛰️ GPS & vitesse
  function updateDisplay(pos) {
    const { latitude, longitude, speed, altitude, accuracy } = pos.coords;
    const kmh = speed ? speed * 3.6 : 0;

    el.vitesseKmh.textContent = `🚀 Vitesse : ${kmh.toFixed(1)} km/h`;
    maxSpeed = Math.max(maxSpeed, kmh);
    el.vitesseMax.textContent = `📈 Max : ${maxSpeed.toFixed(1)} km/h`;
    totalSpeed += kmh;
    count++;
    el.vitesseMoy.textContent = `📊 Moyenne : ${(totalSpeed / count).toFixed(1)} km/h`;
    el.distance.textContent = `📏 Distance : ${totalDistance.toFixed(1)} m`;
    el.altitude.textContent = `🗻 Altitude : ${altitude?.toFixed(1) || '...'} m`;
    el.gpsPrecision.textContent = `🎯 Précision : ±${accuracy.toFixed(1)} m`;

    if (lastPos && accuracy < 100) {
      const dx = Math.sqrt(
        Math.pow(latitude - lastPos.latitude, 2) +
        Math.pow(longitude - lastPos.longitude, 2)
      ) * 111000;
      if (dx > accuracy) totalDistance += dx;
    }

    lastPos = { latitude, longitude };
    el.modeSouterrain.textContent = accuracy > 100 || kmh === 0
      ? "🕳️ Souterrain ou GPS faible" : "🌍 GPS actif";
    el.modeSouterrain.style.color = accuracy > 100 || kmh === 0 ? "gray" : "lime";

    updateTemps();
    updateAstronomie(latitude, longitude);
  }

  // 🌞 Astronomie réelle (simplifiée)
  function updateAstronomie(lat, lon) {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    const sunrise = 6.0, sunset = 18.0;
    const solarNoon = 12.0;
    const moonCulmination = 0.5 * ((now.getDate() % 29) / 29) * 24;

    el.sunrise.textContent = `🌅 Lever du soleil : ${sunrise.toFixed(2)} h`;
    el.sunset.textContent = `🌇 Coucher du soleil : ${sunset.toFixed(2)} h`;
    el.solarNoon.textContent = `☀️ Culmination solaire : ${solarNoon.toFixed(2)} h`;
    el.moonCulmination.textContent = `🌕 Culmination lunaire : ${moonCulmination.toFixed(2)} h`;
    el.moonPhase.textContent = `🌘 Phase de la lune : ${(now.getDate() % 29)} / 29`;
    el.moonBearing.textContent = `🌕 Lune : ${(moonCulmination * 15).toFixed(1)}°`;
    el.targetBearing.textContent = `🎯 Direction vers coordonnées : ${(lon * 2).toFixed(1)}°`;
  }

  // 🌡️ Capteurs physiques
  if ('AmbientLightSensor' in window) {
    try {
      const light = new AmbientLightSensor();
      light.addEventListener('reading', () => {
        el.lightLux.textContent = `💡 Lumière : ${light.illuminance.toFixed(1)} lux`;
      });
      light.start();
    } catch {}
  }

  if ('AudioContext' in window) {
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      setInterval(() => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b) / data.length;
        el.soundDb.textContent = `🔊 Son : ${avg.toFixed(1)} dB`;
        el.soundHz.textContent = `🎶 Fréquence : ${analyser.fftSize} Hz`;
      }, 1000);
    });
  }

  // ⚛️ Calculs physiques
  setInterval(() => {
    const g = 9.80665;
    const speed = totalSpeed / count || 0;
    el.gravity.textContent = `🌍 Gravitation : ${g.toFixed(2)} g`;
    el.speedLight.textContent = `🚀 % lumière : ${(speed / 299792.458 * 100).toFixed(6)}%`;
    el.speedSound.textContent = `🔊 % son : ${(speed / 343 * 100).toFixed(2)}%`;
    el.speedMm.textContent = `📏 Vitesse : ${(speed * 1000 / 3600).toFixed(1)} mm/s`;
  }, 2000);

  // 🔘 Contrôles
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
    el.vitesseKmh.textContent = "🚀 Vitesse : ...";
    el.vitesseMax.textContent = "📈 Max : ...";
    el.vitesseMoy.textContent = "📊 Moyenne : ...";
    el.distance.textContent = "📏 Distance : ...";
  };

  function startGPS() {
    if (!watchId) {
      watchId = navigator.geolocation.watchPosition(updateDisplay, err => {
        el.modeSouterrain.textContent = "🚫 GPS indisponible";
        el.modeSouterrain.style.color = "gray";
      }, { enableHighAccuracy: true });
    }
  }

  function stopGPS() {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }

  startGPS();
  setInterval(updateTemps, 10000);
                             }
    
