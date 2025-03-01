import axios from 'axios';
import { $ } from './bling';

const mapOptions = {
    center: {lat: 43.2, lng: -79.8},
    zoom: 8
}

function loadPlaces(map, lat = 43.2, lng = -79.8) {
    axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
        .then(res => {
            const places = res.data;
            if(!places.length) {
                alert('no places found');
                return;
            }

            //create a bounds
            const bounds = new google.maps.LatLngBounds();

            const infoWindow = new google.maps.InfoWindow();

            const markers = places.map(place => {
                const [placeLng, placeLat] = place.location.coordinates;
                const position = { lat: placeLat, lng: placeLng };
                bounds.extend(position);
                const marker = new google.maps.Marker({ map, position });
                marker.place = place;
                return marker;
            });            

            //zoom the map to fit all the markers
            map.setCenter(bounds.getCenter());
            map.fitBounds(bounds);

            //when someone click on a marker, show details of the place

            markers.forEach(marker => marker.addEventListener('click', function() {
                const html = `
                <div class="popup">
                    <a href="/store/${this.place.slug}">
                        <img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}" />
                        <p>${this.place.name} - ${this.place.address}</p>
                    </a>
                </div>
                `;
                infoWindow.setContent(html);
                infoWindow.open(map, this)
            }));
        });
}

function makeMap(mapDiv) {
    if(!mapDiv) return;
    //make map
    const map = new google.maps.Map(mapDiv, mapOptions);
    loadPlaces(map);

    const input = $('[name="geolocate"]');
    const autocomplete = new google.map.places.Autocomplete(input);   
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
    });
}

export default makeMap;

//for geolocation: 
//navigator.gelocation.getCurrentPosition()