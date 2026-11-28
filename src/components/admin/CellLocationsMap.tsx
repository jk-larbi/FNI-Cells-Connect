import React, { useEffect, useRef, useState } from 'react';
import { Cell } from '../../types';

declare global {
  interface Window { L?: any; }
}

let leafletPromise: Promise<void> | null = null;
function loadLeaflet(): Promise<void> {
  if (window.L) return Promise.resolve();
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-fni-cell-map]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.dataset.fniCellMap = 'true';
        document.head.appendChild(link);
      }
      const existing = document.querySelector<HTMLScriptElement>('script[data-fni-cell-map]');
      if (existing) {
        if (window.L) return resolve();
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('The map library could not be loaded.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.dataset.fniCellMap = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('The map library could not be loaded.'));
      document.body.appendChild(script);
    });
  }
  return leafletPromise;
}

interface Props { cells: Cell[]; }

export const CellLocationsMap: React.FC<Props> = ({ cells }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapError, setMapError] = useState('');
  const located = cells.filter(cell =>
    Number.isFinite(cell.meeting_latitude) &&
    Number.isFinite(cell.meeting_longitude) &&
    cell.meeting_latitude !== null && cell.meeting_longitude !== null
  );

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then(() => {
      if (cancelled || !containerRef.current || !window.L) return;
      const L = window.L;
      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false }).setView([5.56, -0.20], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);
      }
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      located.forEach(cell => {
        const marker = L.marker([cell.meeting_latitude, cell.meeting_longitude]).addTo(mapRef.current);
        const popup = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = cell.name;
        popup.appendChild(name);
        const address = document.createElement('p');
        address.textContent = cell.venue_address || cell.meeting_location || cell.location || 'Meeting address not added';
        address.style.margin = '4px 0';
        popup.appendChild(address);
        const directions = document.createElement('a');
        directions.href = `https://www.google.com/maps/dir/?api=1&destination=${cell.meeting_latitude},${cell.meeting_longitude}`;
        directions.target = '_blank';
        directions.rel = 'noopener noreferrer';
        directions.textContent = 'Get directions';
        popup.appendChild(directions);
        marker.bindPopup(popup);
        markersRef.current.push(marker);
      });
      if (located.length > 1) {
        mapRef.current.fitBounds(L.latLngBounds(located.map(cell => [cell.meeting_latitude, cell.meeting_longitude])), { padding: [24, 24] });
      } else if (located.length === 1) {
        mapRef.current.setView([located[0].meeting_latitude, located[0].meeting_longitude], 14);
      }
      window.setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }).catch((error: any) => setMapError(error?.message || 'The cell map could not be loaded.'));
    return () => { cancelled = true; };
  }, [cells]);

  useEffect(() => () => {
    markersRef.current.forEach(marker => marker.remove());
    mapRef.current?.remove();
    mapRef.current = null;
  }, []);

  const missing = cells.length - located.length;
  return (
    <section className="fni-cell-location-map rounded-2xl border border-[#E3E8EF] bg-white p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-[#142B4A]">All Cell Locations</h2>
          <p className="text-xs text-[#667085] mt-0.5">Verified meeting venues entered by an administrator</p>
        </div>
        <div className="flex gap-3 text-[11px] font-semibold">
          <span className="text-emerald-700">{located.length} mapped</span>
          <span className={missing ? 'text-amber-700' : 'text-slate-500'}>{missing} awaiting location</span>
        </div>
      </div>
      <div ref={containerRef} className="fni-cell-location-map-canvas w-full h-64 sm:h-80 rounded-xl overflow-hidden bg-slate-100" />
      {mapError && <p role="alert" className="text-xs text-rose-600">{mapError}</p>}
      {located.length === 0 && !mapError && (
        <p className="text-xs text-[#667085]">No cell venue coordinates have been entered yet. Add the real venue address and map coordinates in Edit Cell Details to place a marker.</p>
      )}
      {missing > 0 && (
        <p className="text-xs text-amber-700">{missing} cell{missing === 1 ? '' : 's'} still need verified venue coordinates. No locations are estimated or fabricated.</p>
      )}
    </section>
  );
};
