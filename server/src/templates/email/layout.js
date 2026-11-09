const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** Wraps message content in the shared email shell. All interpolated values are escaped. */
export function renderLayout({ heading, paragraphs, action, footer }) {
  const body = paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join('');
  const button = action
    ? `<p><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:12px 20px;` +
      `background:#c2410c;color:#ffffff;text-decoration:none;border-radius:6px">` +
      `${escapeHtml(action.label)}</a></p>`
    : '';
  const fallback = action
    ? `<p style="font-size:12px;color:#666">If the button does not work, open: ${escapeHtml(action.url)}</p>`
    : '';
  const note = footer ? `<p style="font-size:12px;color:#666">${escapeHtml(footer)}</p>` : '';

  const html =
    `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#222">` +
    `<h2>${escapeHtml(heading)}</h2>${body}${button}${fallback}${note}</div>`;

  const text = [
    heading,
    ...paragraphs,
    action ? `${action.label}: ${action.url}` : '',
    footer ?? '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { html, text };
}
