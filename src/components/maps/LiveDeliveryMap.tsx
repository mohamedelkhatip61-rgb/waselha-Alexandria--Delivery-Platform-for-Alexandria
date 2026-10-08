import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { LocationCoordinates } from '../../types/index.ts';
import { Navigation, Store, Home, Compass, MapPin, LocateFixed, Loader2 } from 'lucide-react';

interface LiveDeliveryMapProps {
  driverLocation?: LocationCoordinates;
  storeLocation?: LocationCoordinates;
  customerLocation?: LocationCoordinates;
  driverHeading?: number;
  driverSpeed?: number;
  driverName?: string;
  storeName?: string;
  customerAddress?: string;
  interactive?: boolean;
  heightClass?: string;
  onLocationSelect?: (coords: LocationCoordinates) => void;
  showAllDrivers?: Array<{
    id: string;
    name: string;
    location: LocationCoordinates;
    isOnline: boolean;
    vehicleType?: string;
    status: string;
  }>;
  onDriverClick?: (driverId: string) => void;
}

export const LiveDeliveryMap: React.FC<LiveDeliveryMapProps> = ({
  driverLocation,
  storeLocation,
  customerLocation,
  driverHeading = 45,
  driverSpeed = 25,
  driverName = 'الكابتن',
  storeName = 'المتجر',
  customerAddress = 'عنوان التوصيل',
  heightClass = 'h-72',
  onLocationSelect,
  showAllDrivers,
  onDriverClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const [isLocatingDevice, setIsLocatingDevice] = useState(false);
  const [deviceGpsMessage, setDeviceGpsMessage] = useState<string | null>(null);
  const [userGpsCoords, setUserGpsCoords] = useState<LocationCoordinates | null>(null);

  // Alexandria Center (Sidi Gaber / Corniche)
  const defaultAlexandriaCenter = { lat: 31.2178, lng: 29.9475 };

  // Alexandria Neighborhoods for quick focus
  const alexNeighborhoods = [
    { name: 'محطة الرمل', lat: 31.2005, lng: 29.8992 },
    { name: 'سيدي جابر', lat: 31.2178, lng: 29.9475 },
    { name: 'سموحة', lat: 31.2162, lng: 29.9540 },
    { name: 'لوران', lat: 31.2425, lng: 29.9710 },
    { name: 'بحري والأنفوشي', lat: 31.2085, lng: 29.8860 },
    { name: 'ميامي', lat: 31.2612, lng: 30.0051 },
  ];

  // Real Device GPS Finder
  const handleGetDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert('خاصية تحديد الموقع GPS غير مدعومة في هذا المتصفح.');
      return;
    }

    setIsLocatingDevice(true);
    setDeviceGpsMessage('جاري جلب إحداثيات GPS الحية من جهازك...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocatingDevice(false);
        const { latitude, longitude } = position.coords;
        const coordsObj: LocationCoordinates = {
          lat: latitude,
          lng: longitude,
          addressName: `موقعي الفعلي الحالي بالإسكندرية (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          city: 'الإسكندرية',
          governorate: 'الإسكندرية',
        };
        setUserGpsCoords(coordsObj);
        setDeviceGpsMessage(`تم تحديد موقعك بدقة عالية عبر GPS: (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        setTimeout(() => setDeviceGpsMessage(null), 4500);

        if (leafletMapRef.current) {
          leafletMapRef.current.setView([latitude, longitude], 16);
        }

        if (onLocationSelect) {
          onLocationSelect(coordsObj);
        }
      },
      (error) => {
        setIsLocatingDevice(false);
        console.warn('GPS location error:', error.message);
        // Fallback to Sidi Gaber Alex if permission denied
        setDeviceGpsMessage('تعذر الوصول إلى GPS - تم ضبط المركز على سيدي جابر بالإسكندرية');
        setTimeout(() => setDeviceGpsMessage(null), 4000);
        if (leafletMapRef.current) {
          leafletMapRef.current.setView([defaultAlexandriaCenter.lat, defaultAlexandriaCenter.lng], 14);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    let isMounted = true;

    const initLeaflet = async () => {
      try {
        const L = (await import('leaflet')).default;
        if (!mapContainerRef.current || !isMounted) return;

        if (!leafletMapRef.current) {
          const initialLat = driverLocation?.lat || storeLocation?.lat || customerLocation?.lat || defaultAlexandriaCenter.lat;
          const initialLng = driverLocation?.lng || storeLocation?.lng || customerLocation?.lng || defaultAlexandriaCenter.lng;

          const map = L.map(mapContainerRef.current, {
            center: [initialLat, initialLng],
            zoom: 14,
            zoomControl: false,
          });

          // Standard OpenStreetMap tiles - 100% Free, NO API KEY required
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
            maxZoom: 19,
            subdomains: ['a', 'b', 'c'],
          }).addTo(map);

          L.control.zoom({ position: 'bottomleft' }).addTo(map);

          map.on('click', (e: any) => {
            if (onLocationSelect) {
              onLocationSelect({
                lat: e.latlng.lat,
                lng: e.latlng.lng,
                addressName: `الموقع المحدد بالإسكندرية: (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`,
                city: 'الإسكندرية',
                governorate: 'الإسكندرية',
              });
            }
          });

          leafletMapRef.current = map;
          markersGroupRef.current = L.layerGroup().addTo(map);
        }

        const map = leafletMapRef.current;
        const group = markersGroupRef.current;
        group.clearLayers();

        const latLngBounds: [number, number][] = [];

        // 1. Show all drivers in Alexandria
        if (showAllDrivers && showAllDrivers.length > 0) {
          showAllDrivers.forEach((drv) => {
            if (!drv.location?.lat) return;
            latLngBounds.push([drv.location.lat, drv.location.lng]);

            const driverHtml = `
              <div class="relative flex items-center justify-center cursor-pointer group">
                <div class="absolute -inset-2 rounded-full ${drv.isOnline ? 'bg-emerald-500/30 animate-ping' : 'bg-slate-500/20'}"></div>
                <div class="relative w-9 h-9 rounded-full ${drv.isOnline ? 'bg-emerald-600 text-white shadow-emerald-500/50' : 'bg-slate-700 text-slate-300'} shadow-lg flex items-center justify-center border-2 border-white">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                </div>
                <div class="absolute -bottom-6 bg-slate-900 text-white text-[11px] px-2 py-0.5 rounded shadow border border-slate-700 whitespace-nowrap font-medium pointer-events-none">
                  ${drv.name.split(' ')[0]} ${drv.isOnline ? '🟢' : '⚪'}
                </div>
              </div>
            `;

            const icon = L.divIcon({
              className: 'custom-driver-icon',
              html: driverHtml,
              iconSize: [36, 36],
              iconAnchor: [18, 18],
            });

            const marker = L.marker([drv.location.lat, drv.location.lng], { icon });
            marker.on('click', () => {
              if (onDriverClick) onDriverClick(drv.id);
            });
            marker.bindPopup(`<b>كابتن الإسكندرية: ${drv.name}</b><br>الحالة: ${drv.status}<br>${drv.isOnline ? '🟢 متصل ومتاح للتوصيل' : '⚪ غير متصل'}`);
            marker.addTo(group);
          });
        }

        // 2. Store Marker
        if (storeLocation?.lat && storeLocation?.lng) {
          latLngBounds.push([storeLocation.lat, storeLocation.lng]);
          const storeHtml = `
            <div class="relative flex items-center justify-center">
              <div class="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 flex items-center justify-center border-2 border-white font-bold">
                🏪
              </div>
              <div class="absolute -bottom-6 bg-slate-900/90 text-amber-400 text-[11px] px-2 py-0.5 rounded shadow border border-amber-500/30 whitespace-nowrap font-bold">
                ${storeName}
              </div>
            </div>
          `;
          const storeIcon = L.divIcon({
            className: 'custom-store-icon',
            html: storeHtml,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });
          L.marker([storeLocation.lat, storeLocation.lng], { icon: storeIcon })
            .bindPopup(`<b>متجر الإسكندرية: ${storeName}</b>`)
            .addTo(group);
        }

        // 3. Customer Marker
        if (customerLocation?.lat && customerLocation?.lng) {
          latLngBounds.push([customerLocation.lat, customerLocation.lng]);
          const custHtml = `
            <div class="relative flex items-center justify-center">
              <div class="w-9 h-9 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center border-2 border-white font-bold">
                📍
              </div>
              <div class="absolute -bottom-6 bg-slate-900/90 text-blue-300 text-[11px] px-2 py-0.5 rounded shadow border border-blue-500/30 whitespace-nowrap font-medium">
                موقع الاستلام
              </div>
            </div>
          `;
          const custIcon = L.divIcon({
            className: 'custom-cust-icon',
            html: custHtml,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });
          L.marker([customerLocation.lat, customerLocation.lng], { icon: custIcon })
            .bindPopup(`<b>عنوان الاستلام بالإسكندرية:</b><br>${customerAddress}`)
            .addTo(group);
        }

        // 4. Active Driver Marker
        if (driverLocation?.lat && driverLocation?.lng) {
          latLngBounds.push([driverLocation.lat, driverLocation.lng]);
          const driverHtml = `
            <div class="relative flex items-center justify-center">
              <div class="absolute -inset-3 rounded-full bg-emerald-500/30 animate-radar"></div>
              <div class="relative w-10 h-10 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-500/50 flex items-center justify-center border-2 border-white font-bold">
                🛵
              </div>
              <div class="absolute -bottom-6 bg-slate-900 text-emerald-400 text-[11px] px-2 py-0.5 rounded shadow border border-emerald-500/40 whitespace-nowrap font-bold">
                ${driverName} (${driverSpeed} كم/س)
              </div>
            </div>
          `;
          const activeDriverIcon = L.divIcon({
            className: 'custom-active-driver',
            html: driverHtml,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });
          L.marker([driverLocation.lat, driverLocation.lng], { icon: activeDriverIcon })
            .bindPopup(`<b>كابتن الإسكندرية: ${driverName}</b><br>السرعة: ${driverSpeed} كم/ساعة`)
            .addTo(group);
        }

        // 5. Draw user real device GPS marker if located
        if (userGpsCoords?.lat && userGpsCoords?.lng) {
          latLngBounds.push([userGpsCoords.lat, userGpsCoords.lng]);
          const userGpsHtml = `
            <div class="relative flex items-center justify-center">
              <div class="absolute -inset-3 rounded-full bg-emerald-500/40 animate-ping"></div>
              <div class="relative w-10 h-10 rounded-full bg-[#22c55e] text-slate-950 shadow-2xl flex items-center justify-center border-2 border-white font-black text-sm">
                📍
              </div>
              <div class="absolute -bottom-6 bg-slate-950 text-emerald-300 text-[11px] px-2.5 py-0.5 rounded-full shadow-lg border border-emerald-500/50 whitespace-nowrap font-black">
                موقعي الحقيقي (GPS)
              </div>
            </div>
          `;
          const userGpsIcon = L.divIcon({
            className: 'custom-user-gps-icon',
            html: userGpsHtml,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });
          L.marker([userGpsCoords.lat, userGpsCoords.lng], { icon: userGpsIcon })
            .bindPopup(`<b>موقعك الحقيقي الفعلي (GPS)</b><br>إحداثيات: ${userGpsCoords.lat.toFixed(4)}, ${userGpsCoords.lng.toFixed(4)}`)
            .addTo(group);
        }

        // 6. Draw connecting route polyline
        const routePoints: [number, number][] = [];
        if (storeLocation?.lat) routePoints.push([storeLocation.lat, storeLocation.lng]);
        if (driverLocation?.lat) routePoints.push([driverLocation.lat, driverLocation.lng]);
        if (customerLocation?.lat) routePoints.push([customerLocation.lat, customerLocation.lng]);

        if (routePoints.length >= 2) {
          L.polyline(routePoints, {
            color: '#10b981',
            weight: 4,
            opacity: 0.85,
            dashArray: '8, 8',
          }).addTo(group);
        }

        if (latLngBounds.length > 1) {
          map.fitBounds(latLngBounds, { padding: [45, 45], maxZoom: 16 });
        } else if (latLngBounds.length === 1) {
          map.setView(latLngBounds[0], 14);
        }

        setTimeout(() => {
          if (leafletMapRef.current) {
            leafletMapRef.current.invalidateSize();
          }
        }, 150);
      } catch (err) {
        console.warn('Leaflet render error or fallback to SVG view:', err);
      }
    };

    initLeaflet();

    return () => {
      isMounted = false;
    };
  }, [
    driverLocation?.lat,
    driverLocation?.lng,
    storeLocation?.lat,
    storeLocation?.lng,
    customerLocation?.lat,
    customerLocation?.lng,
    showAllDrivers,
    driverSpeed,
    userGpsCoords,
  ]);

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-inner`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating GPS HUD Info Card - Alexandria */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs shadow-lg">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
        <span className="font-semibold text-slate-200">تتبع GPS حي - محافظة الإسكندرية</span>
        {driverSpeed > 0 && driverLocation && (
          <span className="text-emerald-400 font-bold border-r border-slate-700 pr-2">
            {driverSpeed} كم/س
          </span>
        )}
      </div>

      {/* Real Device GPS Locate Button & Alexandria Center Focus */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button
          onClick={handleGetDeviceLocation}
          disabled={isLocatingDevice}
          title="تحديد موقعي الفعلي عبر GPS الجهاز باستخدام navigator.geolocation"
          className="bg-[#22c55e] hover:bg-emerald-500 text-slate-950 hover:text-white backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 text-xs font-black transition cursor-pointer border border-emerald-400/80 shadow-emerald-950/40"
        >
          {isLocatingDevice ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
          ) : (
            <LocateFixed className="w-4 h-4 text-slate-950" />
          )}
          <span>موقعي الحقيقي (GPS)</span>
        </button>

        <button
          onClick={() => {
            if (leafletMapRef.current) {
              leafletMapRef.current.setView([defaultAlexandriaCenter.lat, defaultAlexandriaCenter.lng], 13);
            }
          }}
          title="تركيز على كورنيش وسيدي جابر الإسكندرية"
          className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md p-1.5 px-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white transition shadow-lg flex items-center gap-1 text-xs font-medium"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>عروس المتوسط</span>
        </button>
      </div>

      {/* Device GPS Status Notification Pill */}
      {deviceGpsMessage && (
        <div className="absolute top-12 left-3 z-20 bg-emerald-950/95 text-emerald-300 border border-emerald-500/50 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xl animate-fadeIn">
          {deviceGpsMessage}
        </div>
      )}

      {/* Alexandria Quick Neighborhood Strip */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-1 bg-slate-950/80 backdrop-blur-md p-1 rounded-xl border border-slate-800 text-[11px]">
        {alexNeighborhoods.map((n) => (
          <button
            key={n.name}
            onClick={() => {
              if (leafletMapRef.current) {
                leafletMapRef.current.setView([n.lat, n.lng], 14);
              }
            }}
            className="px-2 py-0.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            {n.name}
          </button>
        ))}
      </div>

      {/* Location Selector Guidance */}
      {onLocationSelect && (
        <div className="absolute bottom-3 right-3 z-10 bg-slate-900/95 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 flex items-center gap-1.5 shadow-xl">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span>انقر على الخريطة لاختيار موقعك بالإسكندرية</span>
        </div>
      )}
    </div>
  );
};
