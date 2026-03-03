// A simple variable
let projectTitle = "Weather Data Explorer";

// Logging output
console.log(projectTitle);

// Select an element
document.addEventListener('DOMContentLoaded', () => {
    // Select an element
    const heading = document.querySelector("h1");
    console.log(heading)
    // Change its text
    heading.textContent = projectTitle;



const buttons = document.querySelectorAll('.tab-button');
  const panels = document.querySelectorAll('.tab-panel');

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.tab;

      // Update button states
      buttons.forEach(b => b.classList.remove('active'));
      button.classList.add('active');

      // Update panel visibility
      panels.forEach(panel => {
        panel.classList.toggle(
          'active',
          panel.id === target
        );
      });
    });
  });
    
  // create the map
  const map = L.map('map').setView([39.5, -98.35], 4); // centered on US


  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

    // create a clusterGroup to hold the markers          
  const clusterGroup = L.markerClusterGroup({
  maxClusterRadius: 40,
  iconCreateFunction: function (cluster) {
    
    const markers = cluster.getAllChildMarkers();
    let sumTemp = 0;

    markers.forEach(m => {
      sumTemp += m.properties.TEMP;
    });

    const avgTemp = sumTemp / markers.length;

    return temperatureClusterIcon(avgTemp, markers.length);
  }
});


  fetch('https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/NOAA_METAR_current_wind_speed_direction_v1/FeatureServer/0/query?where=1=1&outFields=*&f=geojson')
    .then(res => res.json())
    .then(data => {
      data.features.forEach(f => {
        const p = f.properties;
      try{
        
        const lat = f.geometry.coordinates[1];
        const lng = f.geometry.coordinates[0];

        const marker = L.marker([lat, lng], {
          //icon: windIcon(p.WIND_SPEED, p.WIND_DIRECT)
          icon: temperatureIcon(p.TEMP)
        });
          // retain the original data on the marker for later use
          marker.properties = p
        marker.bindPopup(`
        Station: ${p.STATION_NAME || "METAR Station"}<br/>

        State, Country:${p.COUNTRY}<br/>

          Wind: ${p.WIND_SPEED} kt @ ${p.WIND_DIRECT}°<br/>

          TEMP: ${p.TEMP}<br/>

          <a href="#"  onclick="get_weather_forcast(${p.LATITUDE}, ${p.LONGITUDE}).then(data => update_forcast(data)); return false;">Show Forecast </a>
        `);

        clusterGroup.addLayer(marker);


      }catch(err){       console.log("skip",err)
      }
        
      });

      map.addLayer(clusterGroup);
    });


    function temperatureIcon(tempC) {
    const size =
      tempC < 0 ? 18 :
      tempC < 10 ? 20 :
      tempC < 25 ? 24 :
                  28;

    return L.divIcon({
      className: "temp-icon",
      iconSize: [size, size],
      html: `
        <div class="temp-marker"
            style="background:${tempColor(tempC)}">
          ${Math.round(tempC)}°
        </div>
      `
    });
  }
  

  const tempLegend = L.control({ position: "bottomright" });

tempLegend.onAdd = function () {
  const div = L.DomUtil.create("div", "temp-legend");

  div.innerHTML = `
    <div class="legend-title">Air Temperature (°F)</div>
    <div class="legend-gradient"></div>
    <div class="legend-labels">
      <span>14</span>
      <span>32</span>
      <span>50</span>
      <span>68</span>
      <span>86</span>
      <span>104+</span>
    </div>
  `;

  return div;
};

tempLegend.addTo(map);


function temperatureClusterIcon(avgTemp, count) {
  const size =
    count < 10 ? 35 :
    count < 50 ? 45 :
                 55;

  return L.divIcon({
    className: "temp-cluster",
    iconSize: [size, size],
    html: `
      <div class="temp-cluster-wrapper"
           style="background:${tempColor(avgTemp)}">
        <div class="temp-cluster-value">
          ${Math.round(avgTemp)}°
        </div>
        <div class="temp-cluster-count">
          ${count}
        </div>
      </div>
    `
  });
}



});



navigator.geolocation.getCurrentPosition(position => {
  let lat = position.coords.latitude;
  let lon = position.coords.longitude;

  get_weather_forcast(lat,lon)
    .then(data => {
    update_forcast(data);
    }              
  )
});

async function get_weather_forcast(lat, lon) {
  console.log("Fetching forecast for:", lat, lon);
  const pointsRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
  const pointsData = await pointsRes.json();
  if (typeof pointsData.properties != "undefined") {
  const forecastRes = await fetch(pointsData.properties.forecast);
  return await forecastRes.json();
  } else {
    alert("Sorry, no forecast data available for your location.");
    return null;
  }
}

update_forcast = function(_forecastData){
    console.log(_forecastData)
    const tbody = document.querySelector('#forecast tbody');
    tbody.innerHTML = ""; // Clear existing rows  
_forecastData.properties.periods.forEach(period => {
  const row = document.createElement('tr');

  row.innerHTML = `
    <td>${period.name}</td>
    <td>${period.temperature}°F</td>
    <td>${period.shortForecast}</td>
  `;

  tbody.appendChild(row);
  
});
drawChart(_forecastData.properties.periods);
} 

let chart;
function drawChart(rawData) {


  const labels = rawData.map(d => new Date(d.startTime));

  const highs = rawData.map(d => d.isDaytime ? d.temperature : null);
  const lows  = rawData.map(d => !d.isDaytime ? d.temperature : null);
 if (chart) {
        chart.destroy();
    }
  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Highs", data: highs, borderColor: "firebrick",spanGaps: true },
        { label: "Lows",  data: lows,  borderColor: "steelblue",spanGaps: true }
      ]
    },
    options: {
      scales: {
        x: {
          type: "time",
          time: { unit: "day" }
        }
      }
    }
  })
}

const TEMP_COLOR_STOPS = [
  { t: -10, color: "#313695" },
  { t:   0, color: "#4575b4" },
  { t:  10, color: "#74add1" },
  { t:  20, color: "#fdae61" },
  { t:  30, color: "#f46d43" },
  { t:  40, color: "#a50026" }
];
function fToC(f) {
  return ((f - 32) * 5) / 9;
}
function tempColor(_temp) {

  let temp=fToC(_temp)
  // clamp
  if (temp <= TEMP_COLOR_STOPS[0].t) {
    return TEMP_COLOR_STOPS[0].color;
  }
  if (temp >= TEMP_COLOR_STOPS[TEMP_COLOR_STOPS.length - 1].t) {
    return TEMP_COLOR_STOPS[TEMP_COLOR_STOPS.length - 1].color;
  }

  // find surrounding stops
  for (let i = 0; i < TEMP_COLOR_STOPS.length - 1; i++) {
    const a = TEMP_COLOR_STOPS[i];
    const b = TEMP_COLOR_STOPS[i + 1];

    if (temp >= a.t && temp <= b.t) {
      const t = (temp - a.t) / (b.t - a.t);

      const c1 = hexToRgb(a.color);
      const c2 = hexToRgb(b.color);

      return rgbToHex({
        r: lerp(c1.r, c2.r, t),
        g: lerp(c1.g, c2.g, t),
        b: lerp(c1.b, c2.b, t)
      });
    }
  }
}

function hexToRgb(hex) {
  const v = hex.replace("#", "");
  return {
    r: parseInt(v.substring(0, 2), 16),
    g: parseInt(v.substring(2, 4), 16),
    b: parseInt(v.substring(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }) {
  return (
    "#" +
    [r, g, b]
      .map(v => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}