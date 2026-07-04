import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JsonSchemaSelector } from './json-schema-selector';

const entries = [
  {
    id: 'user',
    name: 'User',
    description: 'User profile schema',
    schema: {
      type: 'object' as const,
      title: 'User',
      properties: {
        name: { type: 'string' as const },
      },
    },
  },
  {
    id: 'order',
    name: 'Order',
    description: 'Order schema',
    schema: {
      type: 'object' as const,
      title: 'Order',
      properties: {
        id: { type: 'string' as const },
      },
    },
  },
];

describe('JsonSchemaSelector', () => {
  it('renders trigger button by default', () => {
    render(<JsonSchemaSelector entries={entries} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: '选择 Schema' })).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<JsonSchemaSelector entries={entries} onSelect={() => {}} />);
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('shows empty text when entries are empty', async () => {
    const user = userEvent.setup();
    render(
      <JsonSchemaSelector entries={[]} onSelect={() => {}} emptyText="无 schema" />
    );
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    expect(screen.getByText('无 schema')).toBeInTheDocument();
  });

  it('filters entries locally by keyword', async () => {
    const user = userEvent.setup();
    render(<JsonSchemaSelector entries={entries} onSelect={() => {}} />);
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    const search = screen.getByLabelText('搜索 schema');
    await user.type(search, 'order');
    await waitFor(() => {
      expect(screen.queryByText('User')).not.toBeInTheDocument();
      expect(screen.getByText('Order')).toBeInTheDocument();
    });
  });

  it('filters entries locally by description', async () => {
    const user = userEvent.setup();
    render(<JsonSchemaSelector entries={entries} onSelect={() => {}} />);
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    const search = screen.getByLabelText('搜索 schema');
    await user.type(search, 'profile');
    await waitFor(() => {
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.queryByText('Order')).not.toBeInTheDocument();
    });
  });

  it('calls onSearch when search is external', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(
      <JsonSchemaSelector
        entries={entries}
        onSelect={() => {}}
        onSearch={onSearch}
        searchDebounceMs={50}
      />
    );
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    const search = screen.getByLabelText('搜索 schema');
    await user.type(search, 'foo');
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith('foo'));
  });

  it('shows skeleton loaders when loading', async () => {
    const user = userEvent.setup();
    render(
      <JsonSchemaSelector entries={entries} onSelect={() => {}} loading />
    );
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(3);
  });

  it('renders custom trigger and opens dialog', async () => {
    const user = userEvent.setup();
    render(
      <JsonSchemaSelector
        entries={entries}
        onSelect={() => {}}
        trigger={<button type="button">Custom trigger</button>}
      />
    );
    expect(screen.queryByRole('button', { name: '选择 Schema' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Custom trigger' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('pre-selects an entry with selectedId and enables confirm', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <JsonSchemaSelector
        entries={entries}
        onSelect={onSelect}
        selectedId="user"
      />
    );
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    expect(screen.getByRole('button', { name: '确定' })).not.toBeDisabled();
    await user.click(screen.getByRole('button', { name: '确定' }));
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(entries[0]);
    });
  });

  it('previews selected schema and sample data', async () => {
    const user = userEvent.setup();
    render(<JsonSchemaSelector entries={entries} onSelect={() => {}} />);
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    await user.click(screen.getByText('User'));
    expect(screen.getByText(/"title": "User"/)).toBeInTheDocument();
    expect(screen.getByText(/"name": "string"/)).toBeInTheDocument();
  });

  it('calls onSelect with selected entry on confirm', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<JsonSchemaSelector entries={entries} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    await user.click(screen.getByText('Order'));
    await user.click(screen.getByRole('button', { name: '确定' }));
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(entries[1]);
    });
  });

  it('disables confirm when no entry is selected', async () => {
    const user = userEvent.setup();
    render(<JsonSchemaSelector entries={entries} onSelect={() => {}} />);
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
  });

  it('clears pending selection and disables confirm when search filters it out', async () => {
    const user = userEvent.setup();
    render(<JsonSchemaSelector entries={entries} onSelect={() => {}} />);
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    await user.click(screen.getByText('User'));
    expect(screen.getByRole('button', { name: '确定' })).not.toBeDisabled();
    const search = screen.getByLabelText('搜索 schema');
    await user.type(search, 'order');
    await waitFor(() => {
      expect(screen.queryByText('User')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
    });
  });

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<JsonSchemaSelector entries={entries} onSelect={() => {}} />);
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('applies custom classNames', async () => {
    const user = userEvent.setup();
    render(
      <JsonSchemaSelector
        entries={entries}
        onSelect={() => {}}
        classNames={{ listItem: 'custom-list-item' }}
      />
    );
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    expect(screen.getByRole('button', { name: 'User' })).toHaveClass('custom-list-item');
  });
});
