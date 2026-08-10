import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectsField } from '@/app/my-profile/page';

afterEach(cleanup);

describe('profile projects', () => {
  it('adds repeatable structured projects', () => {
    const onChange = vi.fn();
    render(<ProjectsField projects={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));

    expect(onChange).toHaveBeenCalledWith([
      { name: '', description: '', techStack: [] },
    ]);
  });

  it('edits project fields and removes selected technologies', () => {
    const onChange = vi.fn();
    render(
      <ProjectsField
        projects={[
          {
            name: 'Cloud modernization',
            description: 'Modernized a legacy platform.',
            techStack: ['Azure Functions'],
          },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Project name'), {
      target: { value: 'Cloud transformation' },
    });
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Cloud transformation' }),
    ]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Remove Azure Functions from project 1',
      }),
    );
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ techStack: [] }),
    ]);
  });

  it('adds only governed taxonomy technologies through the Add tech action', () => {
    const onChange = vi.fn();
    const view = render(
      <ProjectsField
        projects={[
          {
            name: 'Cloud modernization',
            description: 'Modernized a legacy platform.',
            techStack: [],
          },
        ]}
        onChange={onChange}
      />,
    );

    const picker = view.getByRole('combobox', {
      name: 'Tech stack for project 1',
    });
    const addTech = view.getByRole('button', { name: 'Add tech' });
    expect(addTech).toBeDisabled();

    fireEvent.focus(picker);
    fireEvent.change(picker, { target: { value: 'Azure Functions' } });
    expect(
      view.queryByRole('option', { name: /Other \(specify\)/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(view.getByRole('option', { name: 'Azure Functions' }));

    expect(addTech).toBeEnabled();
    fireEvent.click(addTech);
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ techStack: ['Azure Functions'] }),
    ]);
  });
});
