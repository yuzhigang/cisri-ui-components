import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Switch } from './ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { cn } from '@arim/core';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';

export type JsonSchemaType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'integer';

export interface JsonSchema {
  type?: JsonSchemaType;
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
}

export interface JsonSchemaEditorProps {
  value: JsonSchema;
  onChange: (value: JsonSchema) => void;
  className?: string;
}

const TYPE_OPTIONS: JsonSchemaType[] = [
  'object',
  'array',
  'string',
  'number',
  'integer',
  'boolean',
];

export function JsonSchemaEditor({
  value,
  onChange,
  className,
}: JsonSchemaEditorProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card p-4 text-card-foreground',
        className
      )}
    >
      <SchemaNode value={value} onChange={onChange} path="root" />
    </div>
  );
}

interface SchemaNodeProps {
  value: JsonSchema;
  onChange: (value: JsonSchema) => void;
  path: string;
  name?: string;
  onNameChange?: (name: string) => void;
  onDelete?: () => void;
}

function SchemaNode({
  value,
  onChange,
  path,
  name,
  onNameChange,
  onDelete,
}: SchemaNodeProps) {
  const type = value.type ?? 'object';

  const update = (patch: Partial<JsonSchema>) => {
    onChange({ ...value, ...patch });
  };

  const addProperty = () => {
    const properties = value.properties ?? {};
    const newKey = `field${Object.keys(properties).length + 1}`;
    onChange({
      ...value,
      properties: {
        ...properties,
        [newKey]: { type: 'string' },
      },
    });
  };

  const updatePropertyName = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const properties = value.properties ?? {};
    const entries = Object.entries(properties);
    const newProperties: Record<string, JsonSchema> = {};
    for (const [k, v] of entries) {
      newProperties[k === oldKey ? newKey : k] = v;
    }
    onChange({ ...value, properties: newProperties });
  };

  const updateProperty = (key: string, schema: JsonSchema) => {
    onChange({
      ...value,
      properties: {
        ...(value.properties ?? {}),
        [key]: schema,
      },
    });
  };

  const deleteProperty = (key: string) => {
    const properties = { ...(value.properties ?? {}) };
    delete properties[key];
    onChange({ ...value, properties });
  };

  const toggleRequired = (key: string) => {
    const required = new Set(value.required ?? []);
    if (required.has(key)) required.delete(key);
    else required.add(key);
    onChange({ ...value, required: Array.from(required) });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {onNameChange && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={name ?? ''}
              onChange={(e) => onNameChange(e.target.value)}
              className="h-8 w-32"
            />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Title</Label>
          <Input
            value={value.title ?? ''}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Title"
            className="h-8 w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Select
            value={type}
            onValueChange={(v) => update({ type: v as JsonSchemaType })}
          >
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Input
          value={value.description ?? ''}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Description"
          className="h-8"
        />
      </div>

      {type === 'object' && (
        <div className="space-y-2 border-l border-border pl-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground">
              Properties
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addProperty}
              className="h-7 gap-1 text-xs"
            >
              <Plus className="h-3 w-3" /> Add property
            </Button>
          </div>
          {value.properties && Object.keys(value.properties).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(value.properties).map(([key, schema]) => (
                <Collapsible key={`${path}-${key}`} defaultOpen>
                  <div className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                        <span className="text-sm font-medium">{key}</span>
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={(value.required ?? []).includes(key)}
                            onCheckedChange={() => toggleRequired(key)}
                            className="scale-75"
                          />
                          <Label className="text-xs text-muted-foreground">
                            Required
                          </Label>
                        </div>
                      </div>
                    </div>
                    <CollapsibleContent className="mt-3">
                      <SchemaNode
                        value={schema}
                        onChange={(s) => updateProperty(key, s)}
                        path={`${path}.${key}`}
                        name={key}
                        onNameChange={(newKey) => updatePropertyName(key, newKey)}
                        onDelete={() => deleteProperty(key)}
                      />
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No properties yet.</p>
          )}
        </div>
      )}

      {type === 'array' && (
        <div className="border-l border-border pl-4">
          <Label className="text-xs font-semibold text-muted-foreground">
            Items
          </Label>
          <div className="mt-2 rounded-md border border-border p-3">
            <SchemaNode
              value={value.items ?? { type: 'string' }}
              onChange={(items) => update({ items })}
              path={`${path}.items`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
