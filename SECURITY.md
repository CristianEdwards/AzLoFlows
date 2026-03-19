# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in AzLoFlows, please report it
responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email a description of the vulnerability to the repository maintainers
3. Include steps to reproduce, potential impact, and any suggested fixes

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

## Supported Versions

| Version | Supported |
|---|---|
| Latest release | Yes |
| Older releases | No |

## Security Considerations

- AzLoFlows runs entirely in the browser — no data is transmitted to external
  servers
- Diagram data is stored in browser `localStorage`
- Exported files (SVG, PNG, JSON) are generated client-side
- File imports are validated for correct JSON structure before processing
- All user inputs in the inspector and context menu are sanitised before rendering

## Best Practices

- Clear `localStorage` on shared computers
- Do not include sensitive information in diagram labels or metadata
- Review imported JSON files before loading them
