import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Truck,
  Car,
  Clock,
  Gauge,
  Compass,
  Building2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Flag,
  Share2,
  Info,
} from 'lucide-react';
import { Trip, Driver, Vehicle, TrackingPoint } from '../types';
import { DtmsStorage } from '../utils/storage';
import { generateSixtySecondTelemetry, RouteTelemetryPoint } from '../utils/routeGenerator';
import { compareTripGpsAndOcr, DistanceComparisonResult } from '../utils/distanceComparator';
import { isGPSTrackingEnabled } from '../utils/gpsTracker';

interface LiveTrackingDashboardProps {
  initialTripId?: string;
  onSelectTrip?: (tripId: string) => void;
}

export const LiveTrackingDashboard: React.FC<LiveTrackingDashboardProps> = ({
  initialTripId,
  onSelectTrip,
}) => {
  const allTrips = DtmsStorage.getTrips();
  const drivers = DtmsStorage.getDrivers();
  const vehicles = DtmsStorage.getVehicles();
  const offices = DtmsStorage.getOffices();

  // Active trips prioritizing in_progress, then pending_approval, then initial
  const inProgressTrips = allTrips.filter((t) => t.status === 'in_progress');
  const [selectedTripId, setSelectedTripId] = useState<string>(
    initialTripId || inProgressTrips[0]?.id || allTrips[0]?.id || ''
  );

  const selectedTrip = allTrips.find((t) => t.id === selectedTripId) || allTrips[0];
  const selectedDriver = drivers.find((d) => d.id === selectedTrip?.driver_id);
  const selectedVehicle = vehicles.find((v) => v.id === selectedTrip?.vehicle_id);
  const selectedOffice = offices.find((o) => o.id === selectedTrip?.office_id);

  // 60-second dense telemetry points
  const rawPoints = useMemo(() => {
    if (!selectedTrip || !selectedTrip.id) return [];
    const stored = DtmsStorage.getTripTracking(selectedTrip.id);
    return generateSixtySecondTelemetry(selectedTrip, stored);
  }, [selectedTrip]);

  // Map settings
  const [mapStyle, setMapStyle] = useState<'tactical' | 'street' | 'satellite'>('tactical');
  const [showWaypointDots, setShowWaypointDots] = useState<boolean>(true);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Simulation Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const playbackTimerRef = useRef<any>(null);

  // Reset playback when trip changes
  useEffect(() => {
    setPlaybackIndex(rawPoints.length > 0 ? rawPoints.length - 1 : 0);
    setIsPlaying(false);
    setSelectedPointIndex(null);
  }, [selectedTripId, rawPoints.length]);

  // Simulation loop
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setPlaybackIndex((prev) => {
          if (prev >= rawPoints.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, rawPoints.length]);

  // Active highlighted point
  const currentPoint = rawPoints[playbackIndex] || rawPoints[rawPoints.length - 1];

  // Map Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedPointIndex(null);
  };

  // Compare actual GPS distance with OCR Odometer reading
  const comparison: DistanceComparisonResult | null = useMemo(() => {
    if (!selectedTrip) return null;
    return compareTripGpsAndOcr(selectedTrip, 15);
  }, [selectedTrip]);

  // Compute SVG projection coordinates for GPS points
  const { svgPoints, minLat, maxLat, minLng, maxLng, viewBoxWidth, viewBoxHeight } = useMemo(() => {
    const w = 800;
    const h = 500;
    const padding = 60;

    if (!rawPoints || rawPoints.length === 0) {
      return {
        svgPoints: [],
        minLat: 32,
        maxLat: 34,
        minLng: 43,
        maxLng: 45,
        viewBoxWidth: w,
        viewBoxHeight: h,
      };
    }

    let minLt = Infinity;
    let maxLt = -Infinity;
    let minLg = Infinity;
    let maxLg = -Infinity;

    rawPoints.forEach((p) => {
      if (p.latitude < minLt) minLt = p.latitude;
      if (p.latitude > maxLt) maxLt = p.latitude;
      if (p.longitude < minLg) minLg = p.longitude;
      if (p.longitude > maxLg) maxLg = p.longitude;
    });

    // Add safe margin
    const latSpan = Math.max(0.015, maxLt - minLt);
    const lngSpan = Math.max(0.015, maxLg - minLg);

    minLt -= latSpan * 0.12;
    maxLt += latSpan * 0.12;
    minLg -= lngSpan * 0.12;
    maxLg += lngSpan * 0.12;

    const projected = rawPoints.map((p, idx) => {
      // Standard Mercator-like proportional projection:
      // X maps to Longitude (left to right)
      // Y maps to Latitude (top to bottom inverted)
      const x = padding + ((p.longitude - minLg) / (maxLg - minLg)) * (w - 2 * padding);
      const y = (h - padding) - ((p.latitude - minLt) / (maxLt - minLt)) * (h - 2 * padding);
      return { ...p, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), originalIndex: idx };
    });

    return {
      svgPoints: projected,
      minLat: minLt,
      maxLat: maxLt,
      minLng: minLg,
      maxLng: maxLg,
      viewBoxWidth: w,
      viewBoxHeight: h,
    };
  }, [rawPoints]);

  // Build SVG Path Data for the Route
  const routePathD = useMemo(() => {
    if (svgPoints.length < 2) return '';
    return svgPoints.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');
  }, [svgPoints]);

  // Partial path for playback up to current simulated point
  const playbackPathD = useMemo(() => {
    const subPoints = svgPoints.slice(0, playbackIndex + 1);
    if (subPoints.length < 2) return '';
    return subPoints.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');
  }, [svgPoints, playbackIndex]);

  const activeProjectedPoint = svgPoints[playbackIndex] || svgPoints[svgPoints.length - 1];
  const hoveredPoint = hoveredPointIndex !== null ? svgPoints[hoveredPointIndex] : null;
  const selectedPoint = selectedPointIndex !== null ? svgPoints[selectedPointIndex] : null;
  const detailPoint = hoveredPoint || selectedPoint;

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header & Live Telemetry Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              غرفة التتبع المباشر ورسم مسار الـ GPS (60-Sec Real-Time Telemetry)
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            رسم المسار الميداني كاملاً وفق نقاط GPS المسجلة كل 60 ثانية مع التدقيق الفوري لفارق المسافة
          </p>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span>تسجيل دوري: كل 60 ثانية</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
            {rawPoints.length} نقطة مسجلة
          </div>
        </div>
      </div>

      {/* Formal Standby Notice if GPS is suspended pending official approvals */}
      {!isGPSTrackingEnabled() && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-100 shadow-sm flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-xs">
            <Info className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-bold text-xs">
                إشعار إداري تنظيمي
              </span>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                خدمة بث وتتبع إحداثيات GPS معطلة حالياً بانتظار استكمال الموافقات الرسمية
              </h3>
            </div>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
              تم إيقاف تتبع المواقع الحية مؤقتاً تماشياً مع التعليمات والمتطلبات التنظيمية. يعتمد النظام حالياً على توثيق العدادات المصورة والذكاء الاصطناعي (OCR).
              كود التتبع التكتيكي والمحاكاة ورسم المسارات محفوظ وجاهز بالكامل في النظام للعمل فور صدور الموافقة الرسمية وتفعيلها من لوحة الإعدادات.
            </p>
          </div>
        </div>
      )}

      {/* ⚠️ CRITICAL REGULATORY ALERT BANNER (If difference exceeds 15 km - only when GPS is active) */}
      {isGPSTrackingEnabled() && comparison && comparison.isExceeded && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 text-rose-900 dark:text-rose-100 shadow-lg animate-pulse transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-xs">
                    إنذار رقابي عاجل
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-rose-800 dark:text-rose-200">
                    تنبيه: فارق المسافة بين مسار GPS والعداد ({comparison.difference} كم) يتجاوز الحد المسموح (15 كم)!
                  </h3>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                  {comparison.message}
                </p>
                <div className="mt-2 text-[11px] font-semibold text-rose-800 dark:text-rose-200 bg-rose-100/70 dark:bg-rose-900/40 p-2 rounded-lg inline-block">
                  👉 التوجيه الإلزامي: {comparison.recommendedAction}
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-rose-200 dark:border-rose-800 font-mono text-xs">
              <span className="text-rose-600 dark:text-rose-400 font-bold">فارق المسافة:</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                +{comparison.difference} كم
              </span>
              <span className="text-[10px] text-rose-500">الحد الأقصى: 15.0 كم</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Stage & Controls (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Map Card */}
          <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-slate-950 overflow-hidden shadow-lg relative flex flex-col">
            {/* Map Top Floating Header */}
            <div className="p-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-3 z-10">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold text-xs text-teal-300 font-mono">
                  {selectedTrip?.trip_no}
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-xs font-semibold text-white">
                  {selectedTrip?.destination}
                </span>
              </div>

              {/* Map Layer Toggles & Zoom Controls */}
              <div className="flex items-center gap-1.5 text-xs">
                {/* Map style selector */}
                <div className="flex items-center rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-[11px]">
                  <button
                    onClick={() => setMapStyle('tactical')}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      mapStyle === 'tactical'
                        ? 'bg-teal-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    تكتيكي ليلي
                  </button>
                  <button
                    onClick={() => setMapStyle('street')}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      mapStyle === 'street'
                        ? 'bg-teal-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    شوارع ومدن
                  </button>
                  <button
                    onClick={() => setMapStyle('satellite')}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      mapStyle === 'satellite'
                        ? 'bg-teal-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    قمر صناعي
                  </button>
                </div>

                {/* Waypoint dots toggle */}
                <button
                  onClick={() => setShowWaypointDots(!showWaypointDots)}
                  title="إظهار/إخفاء نقاط الـ 60 ثانية"
                  className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                    showWaypointDots
                      ? 'bg-teal-950 text-teal-300 border-teal-700'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  نقاط 60ث
                </button>

                {/* Zoom buttons */}
                <button
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                  title="تكبير الخريطة"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                  title="تصغير الخريطة"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={resetView}
                  title="إعادة ضبط الرؤية"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive SVG Route Map Canvas */}
            <div className="relative w-full h-[460px] bg-slate-950 overflow-hidden select-none cursor-crosshair">
              {/* Map Background Textures based on selected style */}
              {mapStyle === 'tactical' && (
                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#0f766e_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />
              )}
              {mapStyle === 'street' && (
                <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] [background-size:40px_40px] pointer-events-none" />
              )}
              {mapStyle === 'satellite' && (
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-900 via-slate-900 to-black pointer-events-none" />
              )}

              {/* Geographic Grid Lines & Coordinates Watermark */}
              <div className="absolute top-2 left-2 z-0 font-mono text-[9px] text-teal-800/80 pointer-events-none space-y-0.5">
                <div>N {maxLat.toFixed(3)}° / E {minLng.toFixed(3)}°</div>
                <div>GPS POLLING FREQUENCY: 60 SECONDS</div>
                <div>DTMS FLEET GEODESIC ENGINE</div>
              </div>

              {/* Dynamic SVG Visualizer */}
              <svg
                viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                className="w-full h-full transition-transform duration-200 origin-center"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                }}
              >
                <defs>
                  {/* Glowing Route Filter */}
                  <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>

                  {/* Gradient for full route */}
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>

                  {/* Gradient for active playback trail */}
                  <linearGradient id="activeTrail" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>

                {/* Base Route Shadow / Outer Trail */}
                {routePathD && (
                  <path
                    d={routePathD}
                    fill="none"
                    stroke="#0f766e"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.35"
                  />
                )}

                {/* Complete Planned & Logged Route Line */}
                {routePathD && (
                  <path
                    d={routePathD}
                    fill="none"
                    stroke="url(#routeGradient)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="6 2"
                    filter="url(#routeGlow)"
                    opacity="0.85"
                  />
                )}

                {/* Active Playback Trajectory (Solid glowing line up to current time) */}
                {playbackPathD && (
                  <path
                    d={playbackPathD}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#routeGlow)"
                  />
                )}

                {/* Waypoints recorded every 60 seconds */}
                {showWaypointDots &&
                  svgPoints.map((pt, idx) => {
                    const isStart = idx === 0;
                    const isEnd = idx === svgPoints.length - 1;
                    const isCurrent = idx === playbackIndex;
                    const isHovered = idx === hoveredPointIndex;

                    if (isStart || isEnd) return null; // Rendered with custom big pins below

                    return (
                      <g
                        key={pt.id || idx}
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                        onMouseLeave={() => setHoveredPointIndex(null)}
                        onClick={() => {
                          setPlaybackIndex(idx);
                          setSelectedPointIndex(idx);
                        }}
                      >
                        {/* Interactive touch/click hitbox */}
                        <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" />

                        {/* Outer ring on hover/selected */}
                        {(isHovered || isCurrent) && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="7"
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2"
                            className="animate-pulse"
                          />
                        )}

                        {/* 60-second breadcrumb dot */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered || isCurrent ? '4.5' : '3'}
                          fill={isCurrent ? '#38bdf8' : pt.speed > 60 ? '#10b981' : '#0d9488'}
                          stroke="#0f172a"
                          strokeWidth="1.5"
                        />

                        {/* Optional minute stamp label every 3 points */}
                        {idx % 3 === 0 && (
                          <text
                            x={pt.x}
                            y={pt.y - 8}
                            textAnchor="middle"
                            fill="#94a3b8"
                            fontSize="8"
                            fontFamily="monospace"
                            className="pointer-events-none"
                          >
                            د{idx}
                          </text>
                        )}
                      </g>
                    );
                  })}

                {/* Start Point Marker (نقطة الانطلاق) */}
                {svgPoints[0] && (
                  <g className="cursor-pointer" onClick={() => setPlaybackIndex(0)}>
                    <circle cx={svgPoints[0].x} cy={svgPoints[0].y} r="14" fill="#10b981" opacity="0.25" />
                    <circle cx={svgPoints[0].x} cy={svgPoints[0].y} r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                    <text
                      x={svgPoints[0].x}
                      y={svgPoints[0].y + 18}
                      textAnchor="middle"
                      fill="#34d399"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      نقطة الانطلاق (00:00)
                    </text>
                  </g>
                )}

                {/* End Point Marker (نقطة الوصول) */}
                {svgPoints.length > 1 && svgPoints[svgPoints.length - 1] && (
                  <g
                    className="cursor-pointer"
                    onClick={() => setPlaybackIndex(svgPoints.length - 1)}
                  >
                    <circle
                      cx={svgPoints[svgPoints.length - 1].x}
                      cy={svgPoints[svgPoints.length - 1].y}
                      r="14"
                      fill="#06b6d4"
                      opacity="0.25"
                    />
                    <circle
                      cx={svgPoints[svgPoints.length - 1].x}
                      cy={svgPoints[svgPoints.length - 1].y}
                      r="7"
                      fill="#06b6d4"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={svgPoints[svgPoints.length - 1].x}
                      y={svgPoints[svgPoints.length - 1].y + 18}
                      textAnchor="middle"
                      fill="#22d3ee"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      الوجهة المقصودة
                    </text>
                  </g>
                )}

                {/* Current Animated Vehicle Marker (Oriented with Heading) */}
                {activeProjectedPoint && (
                  <g
                    transform={`translate(${activeProjectedPoint.x}, ${activeProjectedPoint.y})`}
                    className="transition-transform duration-300"
                  >
                    {/* Pulsing Radar Ring */}
                    <circle cx="0" cy="0" r="18" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6">
                      <animate attributeName="r" values="10;26;10" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2s" repeatCount="indefinite" />
                    </circle>

                    {/* Vehicle Circle Base */}
                    <circle cx="0" cy="0" r="10" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />

                    {/* Directional heading pointer */}
                    <g transform={`rotate(${activeProjectedPoint.heading || 0})`}>
                      <polygon points="0,-12 4,-5 -4,-5" fill="#facc15" />
                    </g>
                  </g>
                )}
              </svg>

              {rawPoints.length === 0 && (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-6 pointer-events-none">
                  <div className="max-w-sm rounded-lg border border-slate-700 bg-slate-900/95 p-4 text-center text-slate-300 shadow-lg">
                    <MapPin className="mx-auto mb-2 h-6 w-6 text-teal-400" />
                    <p className="text-sm font-semibold">No GPS points have been recorded for this trip.</p>
                  </div>
                </div>
              )}

              {/* Floating Tooltip for Hovered / Active Waypoint */}
              {detailPoint && (
                <div
                  className="absolute bottom-4 left-4 z-20 p-3 rounded-xl bg-slate-900/95 border border-teal-500/80 shadow-2xl text-white text-xs max-w-xs backdrop-blur-md transition-all pointer-events-none"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                    <span className="font-bold text-teal-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-teal-500" />
                      <span>نقطة الـ 60 ثانية #{detailPoint.index}</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {detailPoint.timestamp.split(' ')[1] || detailPoint.timestamp}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="text-teal-200 font-semibold">
                      {detailPoint.location_name}
                    </div>
                    <div className="flex justify-between font-mono text-slate-400 text-[10px]">
                      <span>السرعة: <strong className="text-white">{detailPoint.speed} كم/س</strong></span>
                      <span>الاتجاه: <strong className="text-white">{detailPoint.heading}°</strong></span>
                    </div>
                    <div className="flex justify-between font-mono text-slate-400 text-[10px]">
                      <span>الإحداثيات:</span>
                      <span className="text-teal-300">
                        {detailPoint.latitude.toFixed(4)}, {detailPoint.longitude.toFixed(4)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      المسافة التراكمية: <strong className="text-white">{detailPoint.cumulativeDistanceKm} كم</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Right Floating Live GPS Speedometer */}
              <div className="absolute top-3 right-3 z-10 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white backdrop-blur-md flex items-center gap-3">
                <div className="text-center font-mono">
                  <div className="text-[10px] text-slate-400">السرعة الآن</div>
                  <div className="text-base font-black text-teal-400">
                    {currentPoint?.speed ?? 0} <span className="text-[10px] font-normal">كم/س</span>
                  </div>
                </div>
                <div className="w-px h-7 bg-slate-700" />
                <div className="text-center font-mono">
                  <div className="text-[10px] text-slate-400">المسافة حتى الآن</div>
                  <div className="text-base font-black text-white">
                    {currentPoint?.cumulativeDistanceKm ?? 0} <span className="text-[10px] font-normal">كم</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Route Playback Controller & 60s Time Scrubber */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 text-white flex flex-col gap-2 z-10">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={rawPoints.length < 2}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>إيقاف مؤقت</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>تشغيل المحاكاة</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setPlaybackIndex(0);
                    }}
                    title="الرجوع للبداية"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {/* Playback speed selector */}
                  <div className="flex items-center rounded-lg bg-slate-800 p-0.5 text-[11px] font-mono">
                    {[1, 2, 4].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2 py-0.5 rounded-md ${
                          playbackSpeed === spd ? 'bg-teal-600 text-white font-bold' : 'text-slate-400'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span>
                    الدقيقة {rawPoints.length === 0 ? 0 : playbackIndex + 1} من {rawPoints.length}
                  </span>
                  <span>•</span>
                  <span className="text-teal-400 font-bold">
                    {currentPoint ? (currentPoint.timestamp.split(' ')[1] || currentPoint.timestamp) : '--:--'}
                  </span>
                </div>
              </div>

              {/* 60-Second Interval Progress Slider */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400">00:00</span>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, rawPoints.length - 1)}
                  value={playbackIndex}
                  disabled={rawPoints.length < 2}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setPlaybackIndex(parseInt(e.target.value, 10));
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500 focus:outline-none"
                />
                <span className="text-[10px] font-mono text-slate-400">
                  +{Math.max(0, rawPoints.length - 1)} د
                </span>
              </div>
            </div>
          </div>

          {/* 60-Second GPS Telemetry Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                <span>سجل نقاط التتبع المسجلة كل 60 ثانية (GPS Breadcrumbs):</span>
              </h3>
              <span className="text-[10px] text-gray-400">
                إجمالي {rawPoints.length} نقطة بفاصل دقيقة واحدة
              </span>
            </div>

            <div className="overflow-x-auto max-h-52 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 font-semibold sticky top-0">
                  <tr>
                    <th className="p-2"># النقطة</th>
                    <th className="p-2">الوقت</th>
                    <th className="p-2">المعلم / الشارع</th>
                    <th className="p-2">الإحداثيات</th>
                    <th className="p-2">السرعة</th>
                    <th className="p-2">الاتجاه</th>
                    <th className="p-2">المسافة التراكمية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-mono">
                  {rawPoints.map((pt, i) => {
                    const isSelected = i === playbackIndex;
                    return (
                      <tr
                        key={pt.id || i}
                        onClick={() => setPlaybackIndex(i)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/50 font-bold text-teal-900 dark:text-teal-200'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              isSelected
                                ? 'bg-teal-600 text-white'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            دقيقة {pt.index}
                          </span>
                        </td>
                        <td className="p-2 text-gray-500">
                          {pt.timestamp.split(' ')[1] || pt.timestamp}
                        </td>
                        <td className="p-2 font-sans font-medium text-gray-900 dark:text-white">
                          {pt.location_name}
                        </td>
                        <td className="p-2 text-gray-500 text-[10px]">
                          {pt.latitude.toFixed(4)}, {pt.longitude.toFixed(4)}
                        </td>
                        <td className="p-2 font-bold text-teal-600 dark:text-teal-400">
                          {pt.speed} كم/س
                        </td>
                        <td className="p-2 text-gray-500">{pt.heading}°</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300">
                          {pt.cumulativeDistanceKm} كم
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Distance Comparison Card & Trips Selector (1 Col) */}
        <div className="space-y-4">
          {/* 1. Distance Comparison & Audit Tool (الطلب البرمجي الأول) */}
          {comparison && (
            <div
              className={`p-4 rounded-2xl border transition-all ${
                comparison.isExceeded
                  ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400 text-rose-950 dark:text-rose-100'
                  : comparison.status === 'review_needed'
                  ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 text-amber-950 dark:text-amber-100'
                  : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 text-emerald-950 dark:text-emerald-100'
              } shadow-xs`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  {comparison.isExceeded ? (
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>مقارنة مسافة GPS ومسافة العداد OCR</span>
                </span>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    comparison.isExceeded
                      ? 'bg-rose-600 text-white animate-pulse'
                      : comparison.status === 'review_needed'
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {comparison.isExceeded
                    ? 'تنبيه: فرق > 15 كم'
                    : comparison.status === 'review_needed'
                    ? 'يحتاج مراجعة'
                    : 'مطابق وسليم'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center my-3">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] text-gray-500 block">مسافة مسار GPS الفعلية</span>
                  <span className="text-sm font-bold font-mono text-teal-600">
                    {comparison.actualGpsDistance} كم
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] text-gray-500 block">مسافة العداد OCR المقروءة</span>
                  <span className="text-sm font-bold font-mono text-gray-900 dark:text-white">
                    {comparison.ocrOdometerDistance} كم
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-gray-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-gray-600 dark:text-gray-400 font-sans">فارق المسافة المحسوب:</span>
                <span
                  className={`font-black text-sm ${
                    comparison.isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-teal-700 dark:text-teal-300'
                  }`}
                >
                  {comparison.difference} كم
                </span>
              </div>

              {/* Alert note */}
              {comparison.isExceeded ? (
                <div className="mt-2.5 text-[11px] p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 leading-snug">
                  ⚠️ <strong>تنبيه رقابي:</strong> تجاوز الفارق 15 كم يستدعي فتح محضر تدقيق للرحلة ومطابقة صور العداد الميدانية قبل الاعتماد.
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                  {comparison.message}
                </p>
              )}
            </div>
          )}

          {/* 2. Selected Vehicle & Driver Telemetry Info */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-teal-600" />
              <span>بيانات المركبة والسائق المكلف</span>
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">السائق:</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedDriver?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الرقم الوظيفي:</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">{selectedDriver?.employee_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">المركبة:</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedVehicle?.vehicle_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">رقم اللوحة:</span>
                <span className="font-mono text-teal-600">{selectedVehicle?.plate_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">المكتب التابع:</span>
                <span className="text-gray-700 dark:text-gray-300">{(selectedOffice?.name || '').split('-')[0]?.trim() || selectedOffice?.name || 'المركز الرئيسي'}</span>
              </div>
            </div>
          </div>

          {/* 3. Fleet Trips Selector */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
              رحلات الأسطول للمتابعة
            </h3>
            <p className="text-[11px] text-gray-400 mb-3">
              اختر أي رحلة لرسم مسارها الـ 60 ثانية وفحص فارق المسافة
            </p>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
              {allTrips.map((trip) => {
                const isSelected = trip.id === selectedTrip?.id;
                const d = drivers.find((x) => x.id === trip.driver_id);
                const v = vehicles.find((x) => x.id === trip.vehicle_id);
                const isDiffAlert = (trip.distance_diff || 0) > 15;

                return (
                  <div
                    key={trip.id}
                    onClick={() => {
                      setSelectedTripId(trip.id);
                      if (onSelectTrip) onSelectTrip(trip.id);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/40 shadow-xs'
                        : 'border-gray-200 dark:border-slate-800 hover:border-teal-400 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-gray-900 dark:text-white font-mono">
                          {trip.trip_no}
                        </span>
                        {isDiffAlert && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold animate-pulse">
                            تنبيه &gt; 15 كم
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          trip.status === 'in_progress'
                            ? 'bg-teal-600 text-white animate-pulse'
                            : trip.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isDiffAlert
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300'
                        }`}
                      >
                        {trip.status === 'in_progress'
                          ? 'نشطة ومباشرة'
                          : trip.status === 'approved'
                          ? 'معتمدة ومؤيدة'
                          : trip.status === 'pending_approval'
                          ? 'بانتظار التأييد'
                          : 'مجدولة'}
                      </span>
                    </div>

                    <p className="font-semibold text-xs text-gray-800 dark:text-gray-200 line-clamp-1">
                      {trip.destination}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 font-mono">
                      <span className="font-sans">{(d?.full_name || '').split(' ')[0] || 'سائق'}</span>
                      <span>
                        عداد: {trip.distance_odometer} كم | فرق: {trip.distance_diff} كم
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
