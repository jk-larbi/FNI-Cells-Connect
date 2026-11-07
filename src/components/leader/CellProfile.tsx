import React from 'react';
import { Cell } from '../../types';
import { Building2, Calendar, Clock, MapPin, Mail, Phone, UserCheck, ShieldCheck } from 'lucide-react';
import { formatDate } from '../../lib/storage';

interface CellProfileProps {
  cell: Cell;
}

export const CellProfile: React.FC<CellProfileProps> = ({ cell }) => {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0F2447] tracking-tight font-serif-title">
          Cell Profile & Information
        </h1>
        <p className="text-sm text-[#5B6472] mt-0.5">
          Official registration and contact records for Forerunners Network International
        </p>
      </div>

      <div className="bg-white border border-[#E3E6EB] rounded-lg p-6 space-y-6 shadow-xs">
        {/* Cell Header Badge */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E3E6EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0F2447] text-[#B8923A] flex items-center justify-center font-bold text-lg font-serif-title shadow-xs">
              {cell.name.slice(0, 1)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#0F2447] font-serif-title">
                {cell.name}
              </h2>
              <p className="text-xs text-[#5B6472] flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-[#B8923A]" />
                <span>{cell.area}</span>
                <span>·</span>
                <span className="text-emerald-700 font-medium">Active Cell</span>
              </p>
            </div>
          </div>
          <span className="text-[11px] text-[#5B6472] bg-[#F6F7F9] px-2.5 py-1 rounded border border-[#E3E6EB] font-mono">
            ID: {cell.id}
          </span>
        </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[#0F2447] pb-1 border-b border-[#E3E6EB]">
              Leadership Assignment
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[#14213D]">
                <UserCheck className="w-4 h-4 text-[#B8923A] shrink-0" />
                <div>
                  <div className="text-[11px] text-[#8C95A3]">Appointed Leader</div>
                  <div className="font-medium text-[#0F2447]">{cell.leader}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[#14213D]">
                <Mail className="w-4 h-4 text-[#B8923A] shrink-0" />
                <div>
                  <div className="text-[11px] text-[#8C95A3]">Official Email</div>
                  <div className="font-medium">{cell.leaderEmail || 'Not assigned'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[#14213D]">
                <Phone className="w-4 h-4 text-[#B8923A] shrink-0" />
                <div>
                  <div className="text-[11px] text-[#8C95A3]">WhatsApp / Mobile</div>
                  <div className="font-medium">{cell.leaderPhone || 'Not assigned'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[#0F2447] pb-1 border-b border-[#E3E6EB]">
              Gathering Schedule
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[#14213D]">
                <Calendar className="w-4 h-4 text-[#B8923A] shrink-0" />
                <div>
                  <div className="text-[11px] text-[#8C95A3]">Meeting Day</div>
                  <div className="font-medium text-[#0F2447]">Every {cell.meetingDay || 'Wednesday'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[#14213D]">
                <Clock className="w-4 h-4 text-[#B8923A] shrink-0" />
                <div>
                  <div className="text-[11px] text-[#8C95A3]">Meeting Time</div>
                  <div className="font-medium text-[#0F2447]">{cell.meetingTime || '18:30 GMT'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[#14213D]">
                <ShieldCheck className="w-4 h-4 text-[#B8923A] shrink-0" />
                <div>
                  <div className="text-[11px] text-[#8C95A3]">Registered Date</div>
                  <div className="font-medium">{formatDate(cell.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ministry Note */}
        <div className="bg-[#F6F7F9] border border-[#E3E6EB] rounded p-4 text-xs text-[#5B6472] leading-relaxed">
          <strong className="text-[#0F2447] block font-medium mb-1">Cell Leader Reporting:</strong>
          Weekly reports must be completed and submitted to the Administrator on or before Monday midnight. In case of schedule or leadership adjustments, contact the Administrator.
        </div>
      </div>
    </div>
  );
};
