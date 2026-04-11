-- Add remaining CV templates (5-11)
INSERT INTO cv_templates (name, file_name, screenshot_url, description) VALUES
('Modern Blue', 'template-5.html', '/images/templates/template-5.png', 'Modern blue accent professional template'),
('Minimal Clean', 'template-6.html', '/images/templates/template-6.png', 'Ultra minimal clean design'),
('Elegant Sidebar', 'template-8.html', '/images/templates/template-8.png', 'Elegant template with sidebar layout'),
('Creative Modern', 'template-9.html', '/images/templates/template-9.png', 'Modern creative template with bold colors'),
('Professional Compact', 'template-10.html', '/images/templates/template-10.png', 'Compact professional two-column layout'),
('Executive Premium', 'template-11.html', '/images/templates/template-11.png', 'Premium executive template with refined styling')
ON CONFLICT DO NOTHING;
