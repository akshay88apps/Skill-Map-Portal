import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CertificationsField,
  normalizedDraft,
} from '@/app/my-profile/page';

afterEach(cleanup);

describe('profile certifications', () => {
  it('migrates legacy certification text into individual draft records', () => {
    const draft = normalizedDraft({
      projects: [],
      ratedSkills: [],
      certs: 'Azure Architect, Power Platform Expert',
    });

    expect(draft.certifications.map((certification) => certification.name)).toEqual([
      'Azure Architect',
      'Power Platform Expert',
    ]);
  });

  it('adds repeatable certification records', () => {
    const onChange = vi.fn();
    render(
      <CertificationsField
        certifications={[]}
        files={{}}
        onChange={onChange}
        onFileChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Add certification' }),
    );
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ clientId: expect.any(String), name: '' }),
    ]);
  });

  it('captures a certification name and accepted image file', () => {
    const onChange = vi.fn();
    const onFileChange = vi.fn();
    render(
      <CertificationsField
        certifications={[{ clientId: 'draft-1', name: '' }]}
        files={{}}
        onChange={onChange}
        onFileChange={onFileChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Certification name'), {
      target: { value: 'Azure Solutions Architect' },
    });
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Azure Solutions Architect' }),
    ]);

    const file = new File(['certificate'], 'azure.png', {
      type: 'image/png',
    });
    fireEvent.change(screen.getByLabelText('Upload certificate file 1'), {
      target: { files: [file] },
    });
    expect(onFileChange).toHaveBeenCalledWith('draft-1', file);
  });

  it('accepts a PDF certification file', () => {
    const onFileChange = vi.fn();
    render(
      <CertificationsField
        certifications={[{ clientId: 'draft-pdf', name: 'PMI PMP' }]}
        files={{}}
        onChange={vi.fn()}
        onFileChange={onFileChange}
      />,
    );
    const input = screen.getByLabelText('Upload certificate file 1');
    expect(input).toHaveAttribute(
      'accept',
      'application/pdf,image/jpeg,image/png,image/webp',
    );
    const pdf = new File(['%PDF-1.7\ncredential'], 'pmp.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(input, { target: { files: [pdf] } });

    expect(onFileChange).toHaveBeenCalledWith('draft-pdf', pdf);
  });

  it('links an existing stored certificate image for viewing', () => {
    render(
      <CertificationsField
        certifications={[
          {
            clientId: 'cert-1',
            id: 'cert-1',
            name: 'Azure Solutions Architect',
            attachmentFileName: 'azure.webp',
            attachmentContentType: 'image/webp',
            hasAttachment: true,
          },
        ]}
        files={{}}
        onChange={vi.fn()}
        onFileChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('link', { name: 'View uploaded certificate' }),
    ).toHaveAttribute('href', '/api/certifications/cert-1/file');
  });
});
