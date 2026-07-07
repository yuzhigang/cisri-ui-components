import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldConfigPanel } from './field-config-panel';

describe('FieldConfigPanel primitive field', () => {
  it('renders the widget select for a string field', () => {
    render(
      <FieldConfigPanel schema={{ type: 'string' }} uiField={{ 'ui:widget': 'text' }} onPatch={vi.fn()} />
    );
    expect(screen.getByText('Widget')).toBeInTheDocument();
  });

  it('emits a widget patch when the widget select changes', async () => {
    const onPatch = vi.fn();
    const user = userEvent.setup();
    render(
      <FieldConfigPanel schema={{ type: 'string' }} uiField={{ 'ui:widget': 'text' }} onPatch={onPatch} />
    );
    await user.click(screen.getByRole('combobox', { name: 'widget' }));
    await user.click(screen.getByRole('option', { name: 'textarea' }));
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:widget': 'textarea' });
  });

  it('emits a label patch when the label input changes', () => {
    const onPatch = vi.fn();
    render(<FieldConfigPanel schema={{ type: 'string' }} uiField={undefined} onPatch={onPatch} />);
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Full Name' } });
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:label': 'Full Name' });
  });

  it('emits ui:label false when the hide-label switch is toggled on', () => {
    const onPatch = vi.fn();
    render(<FieldConfigPanel schema={{ type: 'string' }} uiField={undefined} onPatch={onPatch} />);
    fireEvent.click(screen.getByRole('switch', { name: '隐藏 label' }));
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:label': false });
  });

  it('emits ui:hidden true when the hidden switch is toggled on', () => {
    const onPatch = vi.fn();
    render(<FieldConfigPanel schema={{ type: 'string' }} uiField={undefined} onPatch={onPatch} />);
    fireEvent.click(screen.getByRole('switch', { name: '隐藏字段' }));
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:hidden': true });
  });

  it('emits a help patch and a classNames patch', () => {
    const onPatch = vi.fn();
    render(<FieldConfigPanel schema={{ type: 'string' }} uiField={undefined} onPatch={onPatch} />);
    fireEvent.change(screen.getByLabelText('Help'), { target: { value: 'Your name' } });
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:help': 'Your name' });
    fireEvent.change(screen.getByLabelText('Class names'), { target: { value: 'extra' } });
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:classNames': 'extra' });
  });

  it('emits ui:placeholder when the placeholder input changes (primitive only)', () => {
    const onPatch = vi.fn();
    render(<FieldConfigPanel schema={{ type: 'string' }} uiField={undefined} onPatch={onPatch} />);
    fireEvent.change(screen.getByLabelText('Placeholder'), { target: { value: 'type here' } });
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:placeholder': 'type here' });
  });
});

describe('FieldConfigPanel object field', () => {
  it('does not render widget/placeholder/disabled/readonly for an object field', () => {
    render(
      <FieldConfigPanel
        schema={{ type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } } }}
        uiField={{ 'ui:order': ['a', 'b'] }}
        onPatch={vi.fn()}
      />
    );
    expect(screen.queryByText('Widget')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Placeholder')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: '禁用' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: '只读' })).not.toBeInTheDocument();
    // common controls still present
    expect(screen.getByLabelText('Label')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '隐藏字段' })).toBeInTheDocument();
  });
});