'use client';

import React from 'react';

interface Channel {
  id: string;
  name: string;
}

interface ChannelSelectorProps {
  channels: Channel[];
  activeId: string | null;
  onChange: (id: string) => void;
}

export default function ChannelSelector({ channels, activeId, onChange }: ChannelSelectorProps) {
  return (
    <select
      value={activeId || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={channels.length === 0}
      className="bg-transparent border border-border rounded-full px-2 py-0.5 text-[10px] outline-none font-bold text-violet-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {channels.length === 0 ? (
        <option value="" disabled>
          No channels
        </option>
      ) : (
        channels.map((ch) => (
          <option key={ch.id} value={ch.id}>
            # {ch.name}
          </option>
        ))
      )}
    </select>
  );
}
