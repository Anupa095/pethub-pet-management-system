import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import BottomNavBar from './BottomNavBar';

const { width } = Dimensions.get('window');

const CATEGORY_QUERIES = {
    hospital: { label: 'Pet Hospital', color: '#EF4444', bgColor: '#FEE2E2' },
    boarding: { label: 'Pet Boarding', color: '#3B82F6', bgColor: '#DBEAFE' },
    shop: { label: 'Pet Shop', color: '#10B981', bgColor: '#D1FAE5' },
};

function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function formatDistance(km) {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
}

async function fetchNearbyPlacesPhoton(lat, lon) {
    const results = { hospital: [], boarding: [], shop: [] };
    const seenIds = new Set();

    const url = `https://photon.komoot.io/api/?q=pet&lat=${lat}&lon=${lon}&limit=100`;

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) throw new Error("Server Error");
        
        const json = await res.json();
        if (!json || !json.features) return results;

        json.features.forEach((feature, index) => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;
            
            if (!coords || coords.length < 2) return;
            const pLon = coords[0];
            const pLat = coords[1];
            
            const distanceKm = getDistanceKm(lat, lon, pLat, pLon);
            if (distanceKm > 50) return; 

            const baseId = props.osm_id ? String(props.osm_id) : `pet_${index}_${Math.random().toString(36).substr(2, 4)}`;

            if (seenIds.has(baseId)) return;
            seenIds.add(baseId);

            const name = props.name || props.street || 'Pet Service';
            const address = [props.street, props.city, props.country].filter(Boolean).join(', ');
            const lowerName = name.toLowerCase();

            const entry = {
                id: baseId,
                name,
                lat: pLat,
                lon: pLon,
                distance: formatDistance(distanceKm),
                distanceValue: distanceKm,
                address: address || 'Address not available',
            };

            const osmValue = (props.osm_value || '').toLowerCase();

            if (
                osmValue === 'animal_boarding' || 
                lowerName.includes('boarding') || 
                lowerName.includes('hotel') || 
                lowerName.includes('hostel') || 
                lowerName.includes('daycare') || 
                lowerName.includes('care') || 
                lowerName.includes('kennel') ||
                lowerName.includes('dog hotel') ||
                (lowerName.includes('dog') && lowerName.includes('hotel'))
            ) {
                results.boarding.push(entry);
            } 
            else if (
                osmValue === 'veterinary' || 
                lowerName.includes('hospital') || 
                lowerName.includes('vet') || 
                lowerName.includes('clinic') || 
                lowerName.includes('surgery')
            ) {
                results.hospital.push(entry);
            } 
            else {
                results.shop.push(entry);
            }
        });

        Object.keys(results).forEach((key) => {
            results[key].sort((a, b) => a.distanceValue - b.distanceValue);
        });

        return results;
    } catch (err) {
        console.log("Photon Fetch Error: ", err.message);
        throw err;
    }
}

function countTotal(results) {
    return results.hospital.length + results.boarding.length + results.shop.length;
}

function buildLeafletHtml(lat, lon, places) {
    const allMarkers = [];
    Object.entries(places).forEach(([key, list]) => {
        const color = CATEGORY_QUERIES[key].color;
        list.forEach((p) => {
            allMarkers.push({ ...p, color, label: CATEGORY_QUERIES[key].label });
        });
    });

    const markersJs = allMarkers
        .map(
            (m) => `
            markers["${m.id}"] = L.circleMarker([${m.lat}, ${m.lon}], {
                radius: 8,
                fillColor: "${m.color}",
                color: "#fff",
                weight: 2,
                fillOpacity: 0.9
            }).addTo(map).bindPopup("<div style='font-family: system-ui; padding: 2px;'><b style='color:#1F2937;'>${m.name.replace(/"/g, '')}</b><br/><span style='color:#6B7280; font-size:11px;'>${m.label} • ${m.distance}</span></div>");`
        )
        .join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; background: #f6f1e8; }
        .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    </style>
</head>
<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lon}], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        L.circleMarker([${lat}, ${lon}], {
            radius: 9,
            fillColor: "#111827",
            color: "#fff",
            weight: 2.5,
            fillOpacity: 1
        }).addTo(map).bindPopup("<b>You are here</b>");

        var markers = {};
        ${markersJs}

        window.addEventListener('message', function(event) {
            var data = JSON.parse(event.data);
            if (data.type === 'FOCUS_PLACE') {
                var marker = markers[data.id];
                if (marker) {
                    map.setView([data.lat, data.lon], 16, { animate: true, duration: 1 });
                    marker.openPopup();
                }
            }
        });
    </script>
</body>
</html>`;
}

export default function NearBy() {
    const [location, setLocation] = useState(null);
    const [places, setPlaces] = useState({ hospital: [], boarding: [], shop: [] });
    const [status, setStatus] = useState('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const webViewRef = useRef(null);

    const loadData = useCallback(async () => {
        setStatus('loading');
        try {
            const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
            if (permStatus !== 'granted') {
                setStatus('denied');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = loc.coords;
            setLocation({ lat: latitude, lon: longitude });

            const results = await fetchNearbyPlacesPhoton(latitude, longitude);
            setPlaces(results);
            setStatus('ready');
        } catch (err) {
            setErrorMessage(err.message);
            setStatus('error');
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handlePlacePress = (item) => {
        if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({
                type: 'FOCUS_PLACE',
                id: item.id,
                lat: item.lat,
                lon: item.lon,
            }));
        }
    };

    function PlaceCard({ item, category }) {
        const cat = CATEGORY_QUERIES[category];
        return (
            <TouchableOpacity
                style={styles.placeCard}
                onPress={() => handlePlacePress(item)}
                activeOpacity={0.8}
            >
                <View style={[styles.tag, { backgroundColor: cat.bgColor }]}>
                    <Text style={[styles.tagText, { color: cat.color }]}>{cat.label}</Text>
                </View>
                <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.placeAddress} numberOfLines={1}>
                    {item.address || 'Address not available'}
                </Text>
                <View style={styles.cardFooter}>
                    <Text style={styles.placeDistance}>{item.distance}</Text>
                    <Text style={styles.awayText}>away</Text>
                </View>
            </TouchableOpacity>
        );
    }

    const totalFound = countTotal(places);

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Explore Nearby</Text>
                    <Text style={styles.subtitle}>Discover trusted services for your companion</Text>
                </View>

                {status === 'loading' && (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="small" color="#111827" />
                        <Text style={styles.centerText}>Searching for pet services within 50 km...</Text>
                    </View>
                )}

                {status === 'denied' && (
                    <View style={styles.centerBox}>
                        <Text style={styles.centerText}>Location permission is needed to show nearby places.</Text>
                    </View>
                )}

                {status === 'error' && (
                    <View style={styles.centerBox}>
                        <Text style={styles.centerText}>Couldn't load nearby places. Check your connection.</Text>
                    </View>
                )}

                {status === 'ready' && location && (
                    <>
                        <View style={styles.mapWrapper}>
                            <WebView
                                ref={webViewRef}
                                originWhitelist={['*']}
                                source={{ html: buildLeafletHtml(location.lat, location.lon, places) }}
                                style={styles.map}
                            />
                        </View>

                        {totalFound === 0 ? (
                            <View style={styles.centerBox}>
                                <Text style={styles.centerText}>
                                    No pet services found within 50 km.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Pet Hospital */}
                                <Text style={styles.sectionHeader}>Pet Hospitals</Text>
                                {places.hospital.length === 0 ? (
                                    <Text style={styles.emptyText}>No pet hospitals found nearby.</Text>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
                                        {places.hospital.map((item) => (
                                            <PlaceCard key={item.id} item={item} category="hospital" />
                                        ))}
                                    </ScrollView>
                                )}

                                {/* Pet Boarding */}
                                <Text style={styles.sectionHeader}>Pet Boarding</Text>
                                {places.boarding.length === 0 ? (
                                    <Text style={styles.emptyText}>No pet boarding or dog hotels found nearby.</Text>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
                                        {places.boarding.map((item) => (
                                            <PlaceCard key={item.id} item={item} category="boarding" />
                                        ))}
                                    </ScrollView>
                                )}

                                {/* Pet Shop */}
                                <Text style={styles.sectionHeader}>Pet Shops</Text>
                                {places.shop.length === 0 ? (
                                    <Text style={styles.emptyText}>No pet shops found nearby.</Text>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
                                        {places.shop.map((item) => (
                                            <PlaceCard key={item.id} item={item} category="shop" />
                                        ))}
                                    </ScrollView>
                                )}
                            </>
                        )}
                    </>
                )}
            </ScrollView>
            <BottomNavBar />
        </View>
    );
}

const styles = StyleSheet.create({
    // UPDATE: Meal Plan පිටුවේ පසුබිම් වර්ණය මෙතනට එක් කරන ලදී
    container: { flex: 1, backgroundColor: '#f6f1e8' },
    scrollContent: { paddingBottom: 120 },
    header: { paddingHorizontal: 24, paddingTop: 24, marginBottom: 20 },
    title: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, fontWeight: '400' },
    centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
    centerText: { marginTop: 12, fontSize: 14, color: '#6B7280', fontWeight: '500', textAlign: 'center' },
    mapWrapper: { height: 240, marginHorizontal: 24, borderRadius: 24, overflow: 'hidden', marginBottom: 28, backgroundColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    map: { flex: 1 },
    sectionHeader: { fontSize: 17, fontWeight: '700', color: '#1F2937', paddingHorizontal: 24, marginBottom: 12, letterSpacing: -0.2 },
    rowScroll: { paddingLeft: 24, paddingRight: 12, paddingBottom: 24 },
    emptyText: { fontSize: 13, color: '#9CA3AF', paddingHorizontal: 24, marginBottom: 20, fontStyle: 'italic' },
    placeCard: { width: 170, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, marginRight: 14, borderWidth: 1, borderColor: '#EAE5DB', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
    tag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 10 },
    tagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    placeName: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
    placeAddress: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
    cardFooter: { flexDirection: 'row', alignItems: 'baseline' },
    placeDistance: { fontSize: 13, color: '#111827', fontWeight: '700' },
    awayText: { fontSize: 11, color: '#6B7280', marginLeft: 3, fontWeight: '400' },
});