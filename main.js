// Function to get the system's current theme (light or dark)
function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// On page load, check for stored theme in localStorage or fallback to default
let savedTheme = localStorage.getItem('theme') || 'dark';  // Default to 'dark' if no saved preference

// If the theme is 'auto', detect the system's theme
if (savedTheme === 'auto') {
    savedTheme = getSystemTheme();  // Detect system theme (dark or light)
}

// Initialize the map with the appropriate style
const mapboxStyle = savedTheme === 'light'
    ? 'mapbox://styles/meltongisdev/cltp6z6ie01dk01raewq8b9ch'  // Light style
    : 'mapbox://styles/meltongisdev/cm64liz5n007d01stag4m8pee';  // Dark style


// Set up the Mapbox map
mapboxgl.accessToken = 'pk.eyJ1IjoibWVsdG9uZ2lzZGV2IiwiYSI6ImNtNjRsNmJxZTFtOGsycG9kbzJmOHRwZDUifQ.BGbshIeWBeymv1Tu8OsFEg';
const map = new mapboxgl.Map({
  container: 'map',
  style: mapboxStyle,  // Dynamically set the map style based on theme
  center: [144.6261962, -37.712486],
  zoom: 11.5,
  pitch: 40,
  bearing: 5,
  transformRequest: (url, resourceType) => {
    if (resourceType === "Tile" && url.indexOf("https://api.nearmap.com") > -1) {
      return { url, referrerPolicy: "origin" };
    } else {
      return { url };
    }
  },
});

// Define the Nearmap aerial layer
const nearmapAPIKey = 'MTQyNWJjZGQtNjBlZi00Yjc2LWI2N2YtYWQzYjczNmM3Njlk';

const nearMapAerialLayer = {
    id: 'Nearmap_Layer',
    source: 'Nearmap_Source',
    type: 'raster',
    paint: {
      'raster-opacity': ['interpolate', ['exponential', 1.5], ['zoom'], 15, 0, 17, 1],
    },
    layout: {
      visibility: 'visible',
    },
  };

map.on('load', () => {
  // Add Nearmap source
  map.addSource('Nearmap_Source', {
    type: 'raster',
    tiles: [`https://api.nearmap.com/tiles/v3/Vert/{z}/{x}/{y}.png?apikey=${nearmapAPIKey}`],
    minzoom: 16,
    maxzoom: 22,
    bounds: [144.4667201638995, -37.81836486637397, 144.78127999196013, -37.54203040304009],
  });

  map.addLayer(nearMapAerialLayer);
});
    
const tooltip = document.getElementById('tooltip');
const dateInput = document.getElementById('dateInput');
const slider = document.getElementById('slider');
const visibilityStates = {};

document.querySelectorAll('.legend-key').forEach(item => {
    const layerId = item.getAttribute('data-layer');
    visibilityStates[layerId] = true; 
});
    

// Add nav controls to the map
map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

// Bind search box to area   
const bbox = [144.439004, -37.857166, 144.829723, -37.464500]; // [westLng, southLat, eastLng, northLat]

// Event listener for Search
const addressInput = document.getElementById('address');
const suggestionsDiv = document.getElementById('suggestions');

// Event listener for input changes
addressInput.addEventListener('input', function() {
    const query = this.value;

    if (query.length > 2) {
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?bbox=${bbox.join(',')}&access_token=${mapboxgl.accessToken}`;

        fetch(geocodeUrl)
            .then(response => response.json())
            .then(data => {
                suggestionsDiv.innerHTML = '';
                
                if (data.features && data.features.length > 0) {
                    suggestionsDiv.style.display = 'block'; 
                    data.features.forEach((feature,index) => {
                        const suggestionItem = document.createElement('div');

                        // Set inline styles for the suggestion item
                        suggestionItem.textContent = feature.place_name; 
                        suggestionItem.style.cursor = 'pointer';
                        suggestionItem.style.padding = '5px';
                        suggestionItem.style.borderBottom = '1px solid #ddd'; 

                        // Apply rounded corners only to the first and last suggestion items
                        if (index === 0) {
                            suggestionItem.style.borderTopLeftRadius = '8px';
                            suggestionItem.style.borderTopRightRadius = '8px';
                        }
                        if (index === data.features.length - 1) {
                            suggestionItem.style.borderBottomLeftRadius = '8px';
                            suggestionItem.style.borderBottomRightRadius = '8px';
                        }
                        
                        // Get the current Mapbox style (light or dark)
                        const currentStyle = map.getStyle();
                        const isDarkMode = currentStyle.name.includes("dark");

                        // Adjust background color based on the theme
                        suggestionItem.style.backgroundColor = isDarkMode ? '#707070' : 'white';
                        suggestionItem.style.color = isDarkMode ? '#fff' : '#000';
                        suggestionItem.style.transition = 'background-color 0.2s, color 0.2s'; 

                        // Change background color on hover
                        suggestionItem.addEventListener('mouseenter', () => {
                            suggestionItem.style.backgroundColor = isDarkMode ? '#444' : '#f0f0f0';
                        });
                        suggestionItem.addEventListener('mouseleave', () => {
                            suggestionItem.style.backgroundColor = isDarkMode ? '#707070' : 'white';
                        });

                        suggestionItem.addEventListener('click', () => {
                            selectSuggestion(feature);
                        });
                        suggestionsDiv.appendChild(suggestionItem);
                    });
                } else {
                    suggestionsDiv.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error fetching geocode suggestions:', error);
            });
    } else {
        suggestionsDiv.style.display = 'none';
    }
});

// Array to store markers
let markers = [];

// Function to handle selecting a suggestion
function selectSuggestion(feature) {
    addressInput.value = feature.place_name; 
    suggestionsDiv.style.display = 'none'; 
    const coordinates = feature.geometry.coordinates;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers = [];

    // Fly to the new coordinates
    map.flyTo({
        center: coordinates,
        zoom: 16
    });


    addressInput.value = '';
    const newMarker = new mapboxgl.Marker()
        .setLngLat(coordinates)
        .addTo(map);
    markers.push(newMarker);
}


// Function to format text string to area
function formatArea(area, decimalPlaces = 2) {
    if (isNaN(Number(area)) || area === null || area === undefined || area === '') {
        return "N/A";
    }
    const formattedArea = Number(area).toFixed(decimalPlaces);
    return `${parseFloat(formattedArea).toLocaleString()} m²`;
}




// Function to remove all GeoJSON sources and layers
function removeAllSourcesAndLayers() {
    const layers = map.getStyle().layers || [];
    const sources = Object.keys(map.getStyle().sources);

    // Remove all layers
    layers.forEach(layer => {
        if (map.getLayer(layer.id)) {
            map.removeLayer(layer.id);
        }
    });

    // Remove all sources
    sources.forEach(source => {
        if (map.getSource(source)) {
            map.removeSource(source);
        }
    });
}


// Function to re-add all GeoJSON sources and layers
function reAddAllSourcesAndLayers() {

    // Re-add Nearmap layer
    map.addSource('Nearmap_Source', {
        type: 'raster',
        tiles: [`https://api.nearmap.com/tiles/v3/Vert/{z}/{x}/{y}.png?apikey=${nearmapAPIKey}`],
        minzoom: 16,
        maxzoom: 22,
        bounds: [144.4667201638995, -37.81836486637397, 144.78127999196013, -37.54203040304009],
    });

    map.addLayer({
        id: 'Nearmap_Layer',
        source: 'Nearmap_Source',
        type: 'raster',
        paint: {
            'raster-opacity': ['interpolate', ['exponential', 1.5], ['zoom'], 15, 0, 17, 1],
        },
        layout: {
            visibility: 'visible',
        },
    });
}


function addGeoJsonData(geojsonUrl, sourceId) {
    addGeoJsonSourceAndLayers(geojsonUrl, sourceId);

}

document.addEventListener("DOMContentLoaded", function () {
    const suburbWardToggle = document.getElementById("suburbWardToggle");
    const themeToggleButtons = document.querySelectorAll('[data-bs-theme-value]');
    let storedTheme = localStorage.getItem('theme') || 'auto';

    if (storedTheme === 'auto') {
        storedTheme = getSystemTheme();
    }

    function updateThemes() {
        const isDarkMode = storedTheme === 'dark';
        const isSuburbView = !suburbWardToggle.classList.contains("active");

        let style;

        if (isDarkMode && !isSuburbView) {
            style = 'mapbox://styles/meltongisdev/cm71evb1b00gt01sl24jh79e9';
        } else if (isDarkMode && isSuburbView) {
            style = 'mapbox://styles/meltongisdev/cm64liz5n007d01stag4m8pee';
        } else if (!isDarkMode && !isSuburbView) {
            style = 'mapbox://styles/meltongisdev/cm4iz1afz00fm01ra3eipas3p';
        } else if (!isDarkMode && isSuburbView) {
            style = 'mapbox://styles/meltongisdev/cltp6z6ie01dk01raewq8b9ch';
        }

        if (!map.isStyleLoaded()) {
            map.once('style.load', updateThemes);
            return;
        }

        removeAllSourcesAndLayers();
        map.setStyle(style);
        map.once('style.load', () => {
            reAddAllSourcesAndLayers();
            updateThemeStyles(storedTheme);
            applyFiltersWhenSourcesReady();
        });
    }

    function updateThemeStyles(theme) {
        if (theme === 'dark') {
            document.documentElement.style.setProperty('--search-bar-bg-light', '#333');
            document.documentElement.style.setProperty('--search-bar-text-light', 'white');
            document.documentElement.style.setProperty('--search-bar-border-light', '#444');

            document.getElementById('map-legend').style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            document.getElementById('map-legend').style.color = 'white';
        } else {
            document.documentElement.style.setProperty('--search-bar-bg-light', 'white');
            document.documentElement.style.setProperty('--search-bar-text-light', 'black');
            document.documentElement.style.setProperty('--search-bar-border-light', '#ccc');

            document.getElementById('map-legend').style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
            document.getElementById('map-legend').style.color = 'black';
        }
    }

    themeToggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            let themeValue = button.getAttribute('data-bs-theme-value');

            if (themeValue === 'auto') {
                themeValue = getSystemTheme();
            }

            storedTheme = themeValue;
            localStorage.setItem('theme', themeValue);
            updateThemes();

            themeToggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    suburbWardToggle.addEventListener("click", function () {
        this.classList.toggle("active");
        updateThemes();
    });

    updateThemes();
});




// Get the theme toggle buttons
const themeToggleButtons = document.querySelectorAll('[data-bs-theme-value]');

// Add event listeners for theme toggle buttons
themeToggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        let themeValue = button.getAttribute('data-bs-theme-value');
        
        // If 'auto' is selected, detect system's theme
        if (themeValue === 'auto') {
            themeValue = getSystemTheme(); // Detect system theme (dark or light)
        }

        
        // Remove 'active' class from all buttons and add it to the clicked one
        themeToggleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Save theme to localStorage
        localStorage.setItem('theme', themeValue);
    });
});

