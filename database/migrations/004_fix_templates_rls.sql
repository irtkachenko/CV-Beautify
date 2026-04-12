-- Fix RLS policies for cv_templates table
-- Allow only authenticated users to view templates

-- Drop existing policy that doesn't work properly
DROP POLICY IF EXISTS "Anyone can view CV templates" ON cv_templates;

-- Create new policy for authenticated users only
CREATE POLICY "Authenticated users can view CV templates" ON cv_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE cv_templates ENABLE ROW LEVEL SECURITY;

-- Insert default CV templates if they don't exist
INSERT INTO cv_templates (id, name, file_name, screenshot_url, description) VALUES
(1, 'Modern Professional', 'template-1.html', '/images/templates/template-1.png', 'Clean and modern professional template'),
(2, 'Creative Designer', 'template-2.html', '/images/templates/template-2.png', 'Creative template for designers and artists'),
(3, 'Executive Classic', 'template-3.html', '/images/templates/template-3.png', 'Classic executive template with traditional layout'),
(4, 'Tech Minimalist', 'template-4.html', '/images/templates/template-4.png', 'Minimalist template perfect for tech professionals'),
(5, 'Modern Blue', 'template-5.html', '/images/templates/template-5.png', 'Modern blue accent professional template'),
(6, 'Minimal Clean', 'template-6.html', '/images/templates/template-6.png', 'Ultra minimal clean design'),
(7, 'Elegant Sidebar', 'template-8.html', '/images/templates/template-8.png', 'Elegant template with sidebar layout'),
(8, 'Creative Modern', 'template-9.html', '/images/templates/template-9.png', 'Modern creative template with bold colors'),
(9, 'Professional Compact', 'template-10.html', '/images/templates/template-10.png', 'Compact professional two-column layout'),
(10, 'Executive Premium', 'template-11.html', '/images/templates/template-11.png', 'Premium executive template with refined styling')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  file_name = EXCLUDED.file_name,
  screenshot_url = EXCLUDED.screenshot_url,
  description = EXCLUDED.description;
