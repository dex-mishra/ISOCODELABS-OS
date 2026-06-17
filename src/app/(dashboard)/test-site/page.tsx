'use client';

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function TestSitePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Site (AI Generation)</h1>
        <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">
          Generate concept images with Nanobana API and demo videos with Google Veo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <span className="text-base font-semibold">Generative Playground</span>
            <Badge variant="default">Nanobana & Veo Connected</Badge>
          </CardHeader>
          <CardContent className="p-6">
            <div className="max-w-xl space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
                  Select Provider
                </label>
                <select className="px-4 py-2.5 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue">
                  <option>Nanobana (Image Gen)</option>
                  <option>Veo (Video Gen)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
                  Prompt
                </label>
                <textarea
                  placeholder="Describe your design mockup..."
                  rows={4}
                  className="w-full px-4 py-2 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue"
                />
              </div>

              <button className="bg-apple-blue text-white px-4 py-2 text-sm font-medium rounded-apple hover:bg-apple-blueHover transition-colors shadow-apple-sm">
                Generate Preview
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
