import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TemplatePreviewProps {
  title: string;
  content: string;
}

export const TemplatePreview = ({ title, content }: TemplatePreviewProps) => {
  const mockData = {
    first_name: 'John',
    last_name: 'Smith',
    company: 'TechCorp Inc.',
    job_title: 'Marketing Director',
    email: 'john.smith@techcorp.com',
    city: 'San Francisco',
    state: 'California',
    country: 'United States'
  };

  const renderPreview = (text: string) => {
    let preview = text;
    
    // Replace template variables with mock data (double braces)
    Object.entries(mockData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      preview = preview.replace(regex, value);
    });

    return preview;
  };

  return (
    <Card className="bg-muted/20">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm whitespace-pre-wrap font-mono bg-background p-3 rounded border">
          {renderPreview(content) || 'Preview will appear here...'}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Preview uses sample data: John Smith, TechCorp Inc., Marketing Director, etc.
        </p>
      </CardContent>
    </Card>
  );
};