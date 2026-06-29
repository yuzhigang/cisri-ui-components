import { useState } from 'react';
import { JsonSchemaEditor, JsonSchema } from '@arim/json-schema-editor';

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

export function DemoSection() {
  const [schema, setSchema] = useState(initialSchema);

  return (
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
  );
}
