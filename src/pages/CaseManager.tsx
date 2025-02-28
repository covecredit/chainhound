import React, { useState, useEffect, useRef } from 'react';
import { FolderKanban, Plus, Download, Trash2, Edit, Save, FileText, Eye, FileDown, FileJson, File as FilePdf, Upload, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import sampleCasesData from '../data/cases/ByBitHackerDPRK.json';

interface Case {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  notes: string;
}

const CaseManager = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load cases from localStorage on component mount
  useEffect(() => {
    const savedCases = localStorage.getItem('chainhound_cases');
    if (savedCases) {
      try {
        const parsedCases = JSON.parse(savedCases);
        // Convert string dates back to Date objects
        const casesWithDates = parsedCases.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt)
        }));
        setCases(casesWithDates);
      } catch (err) {
        console.error('Failed to parse saved cases:', err);
      }
    } else {
      // Load sample case if no cases exist
      const sampleCase = {
        ...sampleCasesData,
        createdAt: new Date(sampleCasesData.createdAt),
        updatedAt: new Date(sampleCasesData.updatedAt)
      };
      setCases([sampleCase]);
    }
  }, []);
  
  // Save cases to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chainhound_cases', JSON.stringify(cases));
  }, [cases]);
  
  const createNewCase = () => {
    const newCase: Case = {
      id: `case-${Date.now()}`,
      title: 'New Case',
      description: 'Case description',
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: '# Executive Summary\n\nProvide a brief overview of the case.\n\n## Timeline of Events\n\n- Event 1\n- Event 2\n\n## Addresses of Interest\n\n- Address 1: `0x...`\n- Address 2: `0x...`\n\n## Transactions of Interest\n\n- Transaction 1: `0x...`\n- Transaction 2: `0x...`\n\n## Contracts of Interest\n\n- Contract 1: `0x...`\n- Contract 2: `0x...`\n\n## Incident Overview\n\nProvide details about the incident.\n\n## Technical Data\n\nInclude technical details and evidence.\n\n## Conclusion\n\nSummarize findings and recommendations.'
    };
    
    setCases([...cases, newCase]);
    setActiveCase(newCase);
    setIsEditing(true);
    setIsPreview(false);
    setEditTitle(newCase.title);
    setEditDescription(newCase.description);
    setEditNotes(newCase.notes);
  };
  
  const deleteCase = (id: string) => {
    setCases(cases.filter(c => c.id !== id));
    if (activeCase && activeCase.id === id) {
      setActiveCase(null);
      setIsEditing(false);
      setIsPreview(false);
    }
  };
  
  const startEditing = () => {
    if (activeCase) {
      setIsEditing(true);
      setIsPreview(false);
      setEditTitle(activeCase.title);
      setEditDescription(activeCase.description);
      setEditNotes(activeCase.notes);
    }
  };
  
  const saveChanges = () => {
    if (activeCase) {
      const updatedCase = {
        ...activeCase,
        title: editTitle,
        description: editDescription,
        notes: editNotes,
        updatedAt: new Date()
      };
      
      setCases(cases.map(c => c.id === activeCase.id ? updatedCase : c));
      setActiveCase(updatedCase);
      setIsEditing(false);
    }
  };
  
  const togglePreview = () => {
    if (isEditing) {
      // Save current edits to preview
      if (activeCase) {
        const previewCase = {
          ...activeCase,
          title: editTitle,
          description: editDescription,
          notes: editNotes
        };
        setActiveCase(previewCase);
      }
    }
    setIsPreview(!isPreview);
  };
  
  const generateHtmlFromMarkdown = (markdown: string, title: string): string => {
    // Simple HTML template with styling
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - ChainHound Case Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
          h2 { color: #4338ca; margin-top: 30px; }
          h3 { color: #3730a3; }
          pre, code { background-color: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
          pre { padding: 10px; overflow-x: auto; }
          pre code { background-color: transparent; padding: 0; }
          blockquote { border-left: 4px solid #e2e8f0; margin-left: 0; padding-left: 20px; color: #64748b; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
          th { background-color: #f8fafc; }
          img { max-width: 100%; }
          .header { 
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
          }
          .logo {
            font-weight: bold;
            font-size: 24px;
            color: #4f46e5;
          }
          .tagline {
            font-size: 14px;
            color: #6b7280;
            margin-top: -5px;
          }
          .metadata {
            margin-bottom: 30px;
            padding: 15px;
            background-color: #f8fafc;
            border-radius: 5px;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 14px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">ChainHound</div>
            <div class="tagline">hunt for suspicious blockchain activity</div>
          </div>
          <div>Case Report</div>
        </div>
        
        <div class="metadata">
          <h1>${title}</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="content">
          ${markdown
            .replace(/^# .*$/m, '') // Remove the first h1 as we already have it in the metadata
            .replace(/```/g, '<pre><code>')
            .replace(/```/g, '</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/\n- (.*)/g, '\n<li>$1</li>')
            .replace(/<li>/g, '<ul><li>')
            .replace(/<\/li>\n/g, '</li></ul>\n')
            .replace(/<\/ul>\n<ul>/g, '\n')
            .split('\n\n').join('<p>')
          }
        </div>
        
        <div class="footer">
          <p>Generated by ChainHound - Blockchain Forensic Tool</p>
          <p>© ${new Date().getFullYear()} ChainHound</p>
        </div>
      </body>
      </html>
    `;
  };
  
  const generatePdfFromMarkdown = async (markdown: string, title: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const doc = new jsPDF();
      
      // Add header with logo
      doc.setFontSize(24);
      doc.setTextColor(79, 70, 229); // Indigo color
      doc.text("ChainHound", 20, 20);
      
      // Add tagline
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("hunt for suspicious blockchain activity", 20, 25);
      
      // Add title
      doc.setFontSize(20);
      doc.setTextColor(79, 70, 229); // Indigo color
      doc.text(title, 20, 35);
      
      // Add metadata
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
      
      // Add content
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      // Split the markdown into lines and process
      const lines = markdown.split('\n');
      let y = 60;
      
      lines.forEach(line => {
        // Check if we need a new page
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        
        // Process headings
        if (line.startsWith('# ')) {
          doc.setFontSize(18);
          doc.setTextColor(79, 70, 229);
          doc.text(line.substring(2), 20, y);
          y += 10;
        } else if (line.startsWith('## ')) {
          doc.setFontSize(16);
          doc.setTextColor(67, 56, 202);
          doc.text(line.substring(3), 20, y);
          y += 8;
        } else if (line.startsWith('### ')) {
          doc.setFontSize(14);
          doc.setTextColor(55, 48, 163);
          doc.text(line.substring(4), 20, y);
          y += 7;
        } else if (line.startsWith('- ')) {
          // List items
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text(`• ${line.substring(2)}`, 25, y);
          y += 6;
        } else if (line.trim() === '') {
          // Empty line
          y += 4;
        } else {
          // Regular text
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          
          // Split long lines
          const textWidth = doc.getTextWidth(line);
          const pageWidth = 180; // Approximate width in points
          
          if (textWidth > pageWidth) {
            const words = line.split(' ');
            let currentLine = '';
            
            words.forEach(word => {
              const testLine = currentLine + word + ' ';
              if (doc.getTextWidth(testLine) > pageWidth) {
                doc.text(currentLine, 20, y);
                y += 6;
                currentLine = word + ' ';
              } else {
                currentLine = testLine;
              }
            });
            
            if (currentLine.trim()) {
              doc.text(currentLine, 20, y);
              y += 6;
            }
          } else {
            doc.text(line, 20, y);
            y += 6;
          }
        }
      });
      
      // Add footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`ChainHound - Page ${i} of ${pageCount}`, 20, 290);
      }
      
      resolve(doc.output('blob'));
    });
  };
  
  const exportCase = async (format: 'json' | 'report' | 'all') => {
    if (!activeCase) return;
    
    setIsExporting(true);
    
    try {
      if (format === 'json') {
        // Export as JSON
        const content = JSON.stringify(activeCase, (key, value) => {
          if (key === 'createdAt' || key === 'updatedAt') {
            return value.toISOString();
          }
          return value;
        }, 2);
        
        const blob = new Blob([content], { type: 'application/json' });
        saveAs(blob, `chainhound-case-${activeCase.id}-${Date.now()}.json`);
      } else if (format === 'report') {
        // Generate report (HTML and PDF)
        const zip = new JSZip();
        
        // Add HTML report
        const htmlContent = generateHtmlFromMarkdown(activeCase.notes, activeCase.title);
        zip.file(`${activeCase.title.replace(/\s+/g, '-')}-report.html`, htmlContent);
        
        // Add PDF report
        const pdfBlob = await generatePdfFromMarkdown(activeCase.notes, activeCase.title);
        zip.file(`${activeCase.title.replace(/\s+/g, '-')}-report.pdf`, pdfBlob);
        
        // Generate and save the zip file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `chainhound-case-${activeCase.title.replace(/\s+/g, '-')}-report-${Date.now()}.zip`);
      } else if (format === 'all') {
        // Create a zip file with all formats
        const zip = new JSZip();
        
        // Add JSON
        const jsonContent = JSON.stringify(activeCase, (key, value) => {
          if (key === 'createdAt' || key === 'updatedAt') {
            return value.toISOString();
          }
          return value;
        }, 2);
        zip.file(`${activeCase.title.replace(/\s+/g, '-')}.json`, jsonContent);
        
        // Add HTML
        const htmlContent = generateHtmlFromMarkdown(activeCase.notes, activeCase.title);
        zip.file(`${activeCase.title.replace(/\s+/g, '-')}.html`, htmlContent);
        
        // Add PDF
        const pdfBlob = await generatePdfFromMarkdown(activeCase.notes, activeCase.title);
        zip.file(`${activeCase.title.replace(/\s+/g, '-')}.pdf`, pdfBlob);
        
        // Generate and save the zip file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `chainhound-case-${activeCase.title.replace(/\s+/g, '-')}-${Date.now()}.zip`);
      }
    } catch (error) {
      console.error('Error exporting case:', error);
      alert('Failed to export case. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImportError('');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        
        // Determine file type by extension
        if (file.name.endsWith('.json')) {
          // Parse JSON
          const jsonData = JSON.parse(content);
          
          // Validate required fields
          if (!jsonData.id || !jsonData.title || !jsonData.notes) {
            throw new Error('Invalid JSON format: missing required fields');
          }
          
          // Create case object
          const importedCase: Case = {
            id: jsonData.id,
            title: jsonData.title,
            description: jsonData.description || '',
            notes: jsonData.notes,
            createdAt: jsonData.createdAt ? new Date(jsonData.createdAt) : new Date(),
            updatedAt: jsonData.updatedAt ? new Date(jsonData.updatedAt) : new Date()
          };
          
          // Add to cases
          setCases([...cases, importedCase]);
          setActiveCase(importedCase);
        } else {
          throw new Error('Unsupported file format. Please import JSON files.');
        }
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
      } catch (error: any) {
        console.error('Error importing case:', error);
        setImportError(error.message || 'Failed to import case');
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.readAsText(file);
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold flex items-center">
            <FolderKanban className="h-6 w-6 mr-2 text-indigo-600 dark:text-indigo-400" />
            Case Manager
          </h1>
          <div className="flex space-x-2">
            <button 
              onClick={handleImportClick}
              className="bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200 transition flex items-center dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <Upload className="h-4 w-4 mr-1" />
              Import Case
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileImport} 
              accept=".json" 
              className="hidden" 
            />
            <button 
              onClick={createNewCase}
              className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Case
            </button>
          </div>
        </div>
        
        <p className="text-gray-600 mb-2 dark:text-gray-300">
          Create and manage forensic cases with detailed notes and evidence.
        </p>
        
        {importError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-start dark:bg-red-900 dark:text-red-200">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <p>{importError}</p>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/3">
            <h2 className="text-lg font-semibold mb-3">Cases</h2>
            {cases.length === 0 ? (
              <div className="text-center py-8 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                <FileText className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No cases yet</p>
                <button 
                  onClick={createNewCase}
                  className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Create your first case
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {cases.map(c => (
                  <div 
                    key={c.id}
                    className={`p-3 border rounded-lg cursor-pointer transition ${activeCase?.id === c.id ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900 dark:border-indigo-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} dark:border-gray-600`}
                    onClick={() => {
                      setActiveCase(c);
                      setIsEditing(false);
                      setIsPreview(false);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{c.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Updated: {c.updatedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCase(c.id);
                        }}
                        className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="md:w-2/3">
            {activeCase ? (
              <div className="border rounded-lg p-4 dark:border-gray-600">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title
                      </label>
                      <input 
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <input 
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Case Notes (Markdown)
                        </label>
                        <button 
                          onClick={togglePreview}
                          className="text-xs flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {isPreview ? 'Edit' : 'Preview'}
                        </button>
                      </div>
                      
                      {isPreview ? (
                        <div className="border rounded-lg p-4 bg-gray-50 prose max-w-none h-[400px] overflow-y-auto dark:bg-gray-700 dark:border-gray-600 dark:prose-invert">
                          <ReactMarkdown>{editNotes}</ReactMarkdown>
                        </div>
                      ) : (
                        <textarea 
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={15}
                          className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      )}
                    </div>
                    
                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          setIsEditing(false);
                          setIsPreview(false);
                        }}
                        className="bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200 transition mr-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={saveChanges}
                        className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition flex items-center"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-xl font-semibold">{activeCase.title}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Created: {activeCase.createdAt.toLocaleDateString()} | 
                          Updated: {activeCase.updatedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => exportCase('report')}
                          disabled={isExporting}
                          className="bg-indigo-600 text-white py-1 px-3 rounded hover:bg-indigo-700 transition flex items-center text-sm"
                        >
                          {isExporting ? (
                            <>
                               <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full"></div>
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <FilePdf className="h-4 w-4 mr-1" />
                              <span>Generate Report</span>
                            </>
                          )}
                        </button>
                        <button 
                          onClick={() => exportCase('json')}
                          disabled={isExporting}
                          className="bg-indigo-600 text-white py-1 px-3 rounded hover:bg-indigo-700 transition flex items-center text-sm"
                        >
                          {isExporting ? (
                            <>
                              <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full"></div>
                              <span>Exporting...</span>
                            </>
                          ) : (
                            <>
                              <FileJson className="h-4 w-4 mr-1" />
                              <span>Export JSON</span>
                            </>
                          )}
                        </button>
                        <button 
                          onClick={startEditing}
                          className="bg-indigo-600 text-white py-1 px-3 rounded hover:bg-indigo-700 transition flex items-center text-sm"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</h3>
                      <p className="text-gray-600 dark:text-gray-400">{activeCase.description}</p>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Case Notes</h3>
                        <button 
                          onClick={togglePreview}
                          className="text-xs flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {isPreview ? 'View Markdown' : 'Preview'}
                        </button>
                      </div>
                      
                      {isPreview ? (
                        <div className="border rounded-lg p-4 bg-gray-50 h-[400px] overflow-y-auto dark:bg-gray-700 dark:border-gray-600">
                          <div className="prose max-w-none dark:prose-invert">
                            <ReactMarkdown>{activeCase.notes}</ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className="border rounded-lg p-4 bg-gray-50 font-mono text-sm h-[400px] overflow-y-auto whitespace-pre-wrap dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                          {activeCase.notes}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                <FolderKanban className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <h2 className="text-xl font-medium text-gray-600 dark:text-gray-300 mb-2">No Case Selected</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Select an existing case or create a new one</p>
                <button 
                  onClick={createNewCase}
                  className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition flex items-center mx-auto"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Case
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseManager;