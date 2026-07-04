import { useState } from 'react';
import { JsonSchemaEditor, JsonSchema } from '@cisri/json-schema-editor';
import { JsonSchemaSelector, JsonSchemaEntry } from '@cisri/json-schema-selector';

const initialSchema: JsonSchema = {
  type: 'object' as const,
  title: 'User',
  properties: {
    name: { type: 'string' as const, title: 'Name' },
    age: { type: 'integer' as const, title: 'Age' },
    email: { type: 'string' as const, title: 'Email' },
    preferences: {
      type: 'object' as const,
      title: 'Preferences',
      properties: {
        newsletter: { type: 'boolean' as const, title: 'Newsletter' },
        theme: { type: 'string' as const, title: 'Theme' },
      },
    },
  },
  required: ['name', 'email'],
};

const sampleEntries: JsonSchemaEntry[] = [
  {
    id: 'user',
    name: 'User',
    description: 'User profile schema',
    schema: { type: 'object', title: 'User', properties: { name: { type: 'string' } } },
  },
  {
    id: 'order',
    name: 'Order',
    description: 'Order schema',
    schema: { type: 'object', title: 'Order', properties: { id: { type: 'string' } } },
  },
];

export function DemoSection() {
  const [schema, setSchema] = useState(initialSchema);
  const [selectedEntry, setSelectedEntry] = useState<JsonSchemaEntry | null>(null);

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Live Demo</h2>
        <p className="text-muted-foreground">
          Interact with the editor below. Changes update the schema state in real time.
        </p>

        <div className="rounded-lg border border-border bg-card p-6">
          <JsonSchemaEditor value={schema} onChange={setSchema} className="w-full" />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Current schema</h3>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
            <code>{JSON.stringify(schema, null, 2)}</code>
          </pre>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Schema Selector</h2>
        <p className="text-muted-foreground">
          Choose a predefined schema from the selector. The selected entry is shown below and also loaded into the editor above.
        </p>

        <div className="rounded-lg border border-border bg-card p-6">
          <JsonSchemaSelector
            entries={sampleEntries}
            selectedId={selectedEntry?.id}
            onSelect={(entry) => {
              setSelectedEntry(entry);
              setSchema(entry.schema);
            }}
          />
        </div>

        {selectedEntry && (
          <div className="space-y-2">
            <h3 className="font-semibold">Selected schema: {selectedEntry.name}</h3>
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
              <code>{JSON.stringify(selectedEntry, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
