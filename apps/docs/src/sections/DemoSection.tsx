import { useState } from 'react';
import { JsonSchemaEditor, JsonSchema } from '@cisri/json-schema-editor';
import { JsonSchemaSelector, JsonSchemaEntry } from '@cisri/json-schema-selector';
import { DbSchemaEditor, type DbTable } from '@cisri/db-schema-editor';
import { JsonSchemaForm } from '@cisri/json-schema-form';
import { JsonSchemaUiEditor } from '@cisri/json-schema-ui-editor';
import { generateDefaultUiSchema } from '@cisri/json-schema-ui-core';

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

const initialTable: DbTable = {
  id: 'users',
  name: 'users',
  description: 'User accounts table',
  columns: [
    { id: 'c1', name: 'id', type: 'uuid', nullable: false, primaryKey: true, unique: false },
    { id: 'c2', name: 'email', type: 'varchar', nullable: false, primaryKey: false, unique: true },
    {
      id: 'c3',
      name: 'created_at',
      type: 'timestamp',
      nullable: false,
      primaryKey: false,
      unique: false,
    },
  ],
};

const uiEditorSchema: JsonSchema = {
  type: 'object' as const,
  title: 'User',
  properties: {
    name: { type: 'string' as const, title: 'Name' },
    age: { type: 'integer' as const, title: 'Age' },
    role: { type: 'string' as const, title: 'Role', enum: ['admin', 'user', 'guest'] },
    active: { type: 'boolean' as const, title: 'Active' },
  },
  required: ['name'],
};

export function DemoSection() {
  const [schema, setSchema] = useState(initialSchema);
  const [selectedEntry, setSelectedEntry] = useState<JsonSchemaEntry | null>(null);
  const [table, setTable] = useState(initialTable);
  const [formData, setFormData] = useState({ name: '', age: 0, active: false });
  const [uiSchema, setUiSchema] = useState(() => generateDefaultUiSchema(uiEditorSchema));

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

      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">数据库表编辑器</h2>
        <p className="text-muted-foreground">
          结构化编辑数据库表的列与约束：名称、类型、可空、主键、唯一、默认值、描述。支持列的上/下重排、行内「下方插入列」、撤销/重做。空表会显示一个待输入的占位空行。
        </p>

        <div className="rounded-lg border border-border bg-card p-6">
          <DbSchemaEditor value={table} onChange={setTable} className="w-full" />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">当前表结构</h3>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
            <code>{JSON.stringify(table, null, 2)}</code>
          </pre>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">JSON Schema 表单</h2>
        <p className="text-muted-foreground">
          按 JSON Schema 渲染表单、编辑 JSON 数据。支持 uiSchema 提示（widget/label/placeholder/...）。
        </p>

        <div className="rounded-lg border border-border bg-card p-6">
          <JsonSchemaForm
            schema={{
              type: 'object',
              properties: {
                name: { type: 'string', title: 'Name' },
                age: { type: 'integer', title: 'Age' },
                active: { type: 'boolean', title: 'Active' },
              },
              required: ['name'],
            }}
            value={formData}
            onChange={(v) => setFormData(v as { name: string; age: number; active: boolean })}
            className="w-full"
          />
        </div>

        <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
          <code>{JSON.stringify(formData, null, 2)}</code>
        </pre>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">JSON Schema UI 编辑器</h2>
        <p className="text-muted-foreground">
          在默认生成的表单上逐字段配置 UI（widget/label/help/placeholder/hidden/disabled/readonly/classNames），对象字段可拖曳调整顺序。产出 uiSchema。
        </p>

        <div className="rounded-lg border border-border bg-card p-6">
          <JsonSchemaUiEditor
            schema={uiEditorSchema}
            uiSchema={uiSchema}
            onChange={setUiSchema}
            formData={{ name: '', age: 0, role: 'user', active: false }}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">当前 uiSchema</h3>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
            <code>{JSON.stringify(uiSchema, null, 2)}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
