'use client';

import { useState } from 'react';

import { Label } from '@constructive-io/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@constructive-io/ui/select';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [role, setRole] = useState<string>('editor');

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="sel-role">Member role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="sel-role">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrator</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="guest" disabled>
                Guest (invite required)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="sel-region">Region</Label>
          <Select defaultValue="us-east-1">
            <SelectTrigger id="sel-region">
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
      </div>
    </Demo>
  );
}
