'use client';

import { useState } from 'react';
import { Database, Globe2 } from 'lucide-react';

import { Label } from '@constructive-io/ui/label';
import {
  Select,
  SelectContent,
  SelectFieldItem,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectRichItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@constructive-io/ui/select';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicSelectDemo() {
  return (
    <Demo>
      <div className="grid w-full max-w-sm gap-1.5">
        <Label htmlFor="select-environment">Environment</Label>
        <Select defaultValue="production">
          <SelectTrigger id="select-environment">
            <SelectValue placeholder="Select an environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="development">Development</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </Demo>
  );
}

export function ControlledSelectDemo() {
  const [role, setRole] = useState('editor');

  return (
    <Demo>
      <div className="grid w-full max-w-sm gap-1.5">
        <Label htmlFor="select-role">Member role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger id="select-role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="admin">Administrator</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="text-pretty text-sm text-muted-foreground">Current value: {role}</p>
      </div>
    </Demo>
  );
}

export function GroupedSelectDemo() {
  return (
    <Demo>
      <div className="grid w-full max-w-sm gap-1.5">
        <Label htmlFor="select-region">Region</Label>
        <Select defaultValue="us-east-1">
          <SelectTrigger id="select-region">
            <SelectValue placeholder="Select a region" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Americas</SelectLabel>
              <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
              <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Europe</SelectLabel>
              <SelectItem value="eu-west-1">EU West (Ireland)</SelectItem>
              <SelectItem value="eu-central-1">EU Central (Frankfurt)</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </Demo>
  );
}

export function SelectSizesDemo() {
  return (
    <Demo>
      <div className="grid w-full max-w-sm gap-3">
        {(['sm', 'default', 'lg'] as const).map((size) => (
          <Select key={size} defaultValue="active">
            <SelectTrigger size={size} aria-label={`${size} status select`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        ))}
      </div>
    </Demo>
  );
}

export function RichSelectItemsDemo() {
  return (
    <Demo>
      <div className="grid w-full max-w-sm gap-1.5">
        <Label htmlFor="select-resource">Resource</Label>
        <Select defaultValue="database">
          <SelectTrigger id="select-resource">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectRichItem
                value="database"
                icon={<Database aria-hidden="true" />}
                label="Database"
                description="Durable relational storage"
              />
              <SelectRichItem
                value="region"
                icon={<Globe2 aria-hidden="true" />}
                label="Region"
                description="A deployment location"
              />
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectFieldItem value="createdAt" name="createdAt" type="DateTime" />
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicSelectDemo />;
}
