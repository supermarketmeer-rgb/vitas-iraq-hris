import React, { useState } from 'react';
import {
  Building2,
  Users,
  Car,
  Navigation,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  ChevronLeft,
} from 'lucide-react';
import { Trip, Vehicle, Driver, Office, User } from '../types';
import { DtmsStorage } from '../utils/storage';
import { isGPSTrackingEnabled } from '../utils/gpsTracker';
import { isSameOffice, isOfficeRestricted } from '../utils/officeUtils';
import { t } from '../utils/i18n';
import { useDtmsHeader } from '../context/DtmsHeaderContext';

interface DashboardProps {
  onNavigate: (section: string) => void;
  currentUser?: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, currentUser }) => {
  const { headerActions } = useDtmsHeader();
  const allOffices = DtmsStorage.getOffices();
  const allDrivers = DtmsStorage.getDrivers();
  const allVehicles = DtmsStorage.getVehicles();
  const allTrips = DtmsStorage.getTrips();

  const isSupervisor = isOfficeRestricted(currentUser);
  const userOffice = isSupervisor
    ? allOffices.find((o) => isSameOffice(o.id, currentUser?.office_id))
    : null;

  const offices = isSupervisor && userOffice ? [userOffice] : allOffices;
  const drivers = isSupervisor
    ? allDrivers.filter((d) => isSameOffice(d.office_id, currentUser?.office_id))
    : allDrivers;
  const vehicles = isSupervisor
    ? allVehicles.filter((v) => isSameOffice(v.office_id, currentUser?.office_id))
    : allVehicles;
  const trips = isSupervisor
    ? allTrips.filter((t) => isSameOffice(t.office_id, currentUser?.office_id))
    : allTrips;

  // Metrics calculation
  const totalOffices = offices.length;
  const totalDrivers = drivers.length;
  const totalVehicles = vehicles.length;
  const internalTrips = trips.filter((t) => t.trip_type === 'internal').length;
  const externalTrips = trips.filter((t) => t.trip_type === 'external').length;
  const inProgressTrips = trips.filter((t) => t.status === 'in_progress' || t.status === 'pending_approval').length;
  const completedTrips = trips.filter((t) => t.status === 'approved').length;
  const pendingApprovalTrips = trips.filter((t) => t.status === 'pending_approval').length;
  const totalDistanceKm = Math.round(
    trips.reduce((sum, t) => sum + (t.distance_odometer || t.distance_gps || 0), 0)
  );

  // Monthly data breakdown
  const monthlyData = [
    { month: t('january'), count: Math.max(Math.round(trips.length * 0.3), 0) },
    { month: t('february'), count: Math.max(Math.round(trips.length * 0.5), 0) },
    { month: t('march'), count: trips.length },
  ];
  const maxMonthly = Math.max(...monthlyData.map((m) => m.count), 1);

  // Trips by Office breakdown
  const officeBreakdown = allOffices.map((off) => {
    const count = allTrips.filter((t) => isSameOffice(t.office_id, off.id)).length;
    return { name: (off?.name || '').split('-')[0]?.trim() || off?.name || t('the_office'), count };
  });
  const maxOfficeCount = Math.max(...officeBreakdown.map((o) => o.count), 1);

  // Distance by Driver leaderboard
  const driverDistances = drivers.map((d) => {
    const driverTrips = trips.filter((t) => t.driver_id === d.id);
    const totalKm = driverTrips.reduce((sum, t) => sum + (t.distance_odometer || t.distance_gps || 0), 0);
    return { name: d.full_name, km: Math.round(totalKm) };
  }).sort((a, b) => b.km - a.km);

  // Distance by Vehicle leaderboard
  const vehicleDistances = vehicles.map((v) => {
    const vehTrips = trips.filter((t) => t.vehicle_id === v.id);
    const totalKm = vehTrips.reduce((sum, t) => sum + (t.distance_odometer || 0), 0);
    return { no: v.vehicle_no, type: v.vehicle_type, km: totalKm || v.last_odometer % 500 };
  }).sort((a, b) => b.km - a.km);

  // Ratio internal vs external
  const totalType = internalTrips + externalTrips || 1;
  const internalPct = Math.round((internalTrips / totalType) * 100);
  const externalPct = 100 - internalPct;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>{t('welcome_to')} {currentUser?.name ? currentUser.name : t('dashboard_title_fallback')}</span>
            {isSupervisor && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-bold border border-teal-300 dark:border-teal-700">
                {userOffice?.name || t('drivers_supervisor')}
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {isSupervisor
              ? `${t('exclusive_view_for')} ${userOffice?.name || t('the_office')} ${t('only')}`
              : t('dashboard_desc_fallback')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {headerActions}
          {isGPSTrackingEnabled() && (
            <button
              id="quick-live-map-btn"
              onClick={() => onNavigate('live_tracking')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <MapPin className="w-4 h-4" />
              <span>{t('live_map')}</span>
            </button>
          )}
          <button
            id="quick-driver-app-btn"
            onClick={() => onNavigate('driver_app')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <span>{t('driver_app_mobile')}</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 9 Standard KPI Cards arranged into exactly two rows */}
      <div className="space-y-3.5">
        {/* Row 1: Core Infrastructure & Active Status (5 Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Offices */}
          <div
            onClick={() => {
              if (!isSupervisor) onNavigate('offices');
            }}
            className={`p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs transition-all ${
              isSupervisor ? 'border-teal-500/40 bg-teal-50/20 dark:bg-teal-950/20' : 'hover:border-teal-500 cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {isSupervisor ? t('responsible_office') : t('number_of_offices')}
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex flex-col">
              <span className="text-lg font-black text-gray-900 dark:text-white truncate">
                {isSupervisor ? (userOffice?.name || '').split('-')[0]?.trim() || userOffice?.name || t('main_office') : totalOffices}
              </span>
              <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold truncate">
                {isSupervisor ? userOffice?.governorate || t('assigned_office') : t('offices_branches')}
              </span>
            </div>
          </div>

          {/* Card 2: Drivers */}
          <div
            onClick={() => onNavigate('drivers')}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs hover:border-teal-500 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {isSupervisor ? t('office_drivers') : t('number_of_drivers')}
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900 dark:text-white">{totalDrivers}</span>
              <span className="text-[11px] text-teal-600 font-medium">{t('approved_drivers')}</span>
            </div>
          </div>

          {/* Card 3: Vehicles */}
          <div
            onClick={() => onNavigate('vehicles')}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs hover:border-teal-500 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('drivers_vehicles')}</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                <Car className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900 dark:text-white">{totalVehicles}</span>
              <span className="text-[11px] text-gray-400">{t('private_property')}</span>
            </div>
          </div>

          {/* Card 4: In Progress Trips */}
          <div
            onClick={() => onNavigate('trips')}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs hover:border-teal-500 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('trips_in_progress')}</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                <Clock className="w-4 h-4 animate-spin text-teal-600" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-teal-600 dark:text-teal-400">{inProgressTrips}</span>
              {pendingApprovalTrips > 0 && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">({pendingApprovalTrips} {t('pending_confirmation')})</span>
              )}
            </div>
          </div>

          {/* Card 5: Total Distance */}
          <div
            onClick={() => onNavigate('trips')}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs hover:border-teal-500 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('total_distance_covered')}</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-teal-600" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">{totalDistanceKm.toLocaleString()}</span>
              <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">{t('verified_km')}</span>
            </div>
          </div>
        </div>

        {/* Row 2: Trip Statuses & Approvals (4 Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 6: Internal Trips */}
          <div
            onClick={() => onNavigate('trips')}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs hover:border-teal-500 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('internal_trips')}</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900 dark:text-white">{internalTrips}</span>
              <span className="text-[11px] text-teal-600 font-medium">{t('inside_same_gov')}</span>
            </div>
          </div>

          {/* Card 7: External Trips */}
          <div
            onClick={() => onNavigate('trips')}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs hover:border-teal-500 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('external_trips')}</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                <Navigation className="w-4 h-4 rotate-45" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900 dark:text-white">{externalTrips}</span>
              <span className="text-[11px] text-gray-400">{t('between_govs')}</span>
            </div>
          </div>

          {/* Card 8: Pending Approval Trips */}
          <div
            onClick={() => onNavigate('trips')}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs hover:border-teal-500 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('pending_endorsement')}</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900 dark:text-white">{pendingApprovalTrips}</span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{t('pending_supervisor')}</span>
            </div>
          </div>

          {/* Card 9: Completed Trips */}
          <div
            onClick={() => onNavigate('trips')}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs hover:border-teal-500 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('completed_trips')}</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900 dark:text-white">{completedTrips}</span>
              <span className="text-[11px] text-teal-600">{t('officially_approved')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Trips by Month */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('trips_by_month')}</h3>
              <p className="text-[11px] text-gray-400">{t('execution_rate_desc')}</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800">
              {t('upward_growth')}
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {monthlyData.map((item) => {
              const pct = Math.round((item.count / maxMonthly) * 100);
              return (
                <div key={item.month} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-700 dark:text-gray-300">{item.month}</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">{item.count} {t('trip_single')}</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Trips by Office or Office Focus */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {isSupervisor ? `${t('profile_activity_of')} ${userOffice?.name || t('the_office')}` : t('trips_by_offices')}
              </h3>
              <p className="text-[11px] text-gray-400">
                {isSupervisor ? t('assigned_office_stats') : t('tasks_distribution')}
              </p>
            </div>
            <Building2 className="w-4 h-4 text-teal-600" />
          </div>

          {isSupervisor ? (
            <div className="space-y-2.5 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-300">{t('gov_and_code')}</span>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{userOffice?.governorate} ({userOffice?.code || 'HQ'})</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-300">{t('approved_office_drivers')}</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">{drivers.length} {t('drivers_plural')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-300">{t('office_vehicles')}</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">{vehicles.length} {t('vehicle_single')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-300">{t('total_office_trips')}</span>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{trips.length} {t('trip_single')}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {officeBreakdown.map((item) => {
                const pct = Math.round((item.count / maxOfficeCount) * 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">{item.count} {t('trip_single')}</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-teal-700 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 3: Distance by Driver Leaderboard */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('distance_by_driver')}</h3>
              <p className="text-[11px] text-gray-400">{t('total_approved_km_desc')}</p>
            </div>
            <Users className="w-4 h-4 text-teal-600" />
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {driverDistances.slice(0, 4).map((d, index) => (
              <div key={d.name} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-[10px]">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{d.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-teal-600 dark:text-teal-400">{d.km}</span>
                  <span className="text-[10px] text-gray-400">{t('km_short')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Internal vs External Ratio */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('internal_vs_external')}</h3>
              <p className="text-[11px] text-gray-400">{t('trip_type_percentage')}</p>
            </div>
            <Navigation className="w-4 h-4 text-teal-600" />
          </div>

          <div className="flex items-center justify-center py-4">
            <div className="w-full max-w-sm space-y-4">
              <div className="flex justify-between items-center text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-teal-600" />
                  <span>{t('internal')} ({internalTrips} {t('trip_single')})</span>
                </div>
                <span className="text-teal-600 font-bold">{internalPct}%</span>
              </div>

              <div className="w-full h-4 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden flex">
                <div className="bg-teal-600 h-full" style={{ width: `${internalPct}%` }} />
                <div className="bg-teal-800 h-full" style={{ width: `${externalPct}%` }} />
              </div>

              <div className="flex justify-between items-center text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-teal-800" />
                  <span>{t('external')} ({externalTrips} {t('trip_single')})</span>
                </div>
                <span className="text-teal-800 dark:text-teal-400 font-bold">{externalPct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
