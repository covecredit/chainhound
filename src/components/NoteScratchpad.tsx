import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Save, 
  Trash2, 
  Plus, 
  Download, 
  Clock,
  Copy,
  Check
} from 'lucide-react';
import { useCaseManager } from '../hooks/useCaseManager';
import { Note } from '../types/case';

const NoteScratchpad: React.FC = () => {
  const { activeCase, addNote, updateNote, deleteNote } = useCaseManager();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  
  // Update notes when active case changes
  useEffect(() => {
    if (activeCase) {
      setNotes(activeCase.notes);
      
      // Set active note to the most recent one if available
      if (activeCase.notes.length > 0 && !activeNoteId) {
        const mostRecentNote = [...activeCase.notes].sort((a, b) => b.timestamp - a.timestamp)[0];
        setActiveNoteId(mostRecentNote.id);
        setNoteContent(mostRecentNote.content);
      } else if (activeCase.notes.length === 0) {
        setActiveNoteId(null);
        setNoteContent('');
      }
    } else {
      setNotes([]);
      setActiveNoteId(null);
      setNoteContent('');
    }
  }, [activeCase]);
  
  const handleCreateNote = () => {
    if (!activeCase) return;
    
    const newNote = addNote('');
    if (newNote) {
      setActiveNoteId(newNote.id);
      setNoteContent('');
    }
  };
  
  const handleSaveNote = () => {
    if (!activeCase || !activeNoteId) return;
    
    updateNote(activeNoteId, noteContent);
  };
  
  const handleDeleteNote = (noteId: string) => {
    if (!activeCase) return;
    
    deleteNote(noteId);
    
    if (activeNoteId === noteId) {
      // If there are other notes, set the first one as active
      if (notes.length > 1) {
        const remainingNotes = notes.filter(n => n.id !== noteId);
        setActiveNoteId(remainingNotes[0].id);
        setNoteContent(remainingNotes[0].content);
      } else {
        setActiveNoteId(null);
        setNoteContent('');
      }
    }
  };
  
  const handleNoteSelect = (noteId: string) => {
    const selectedNote = notes.find(n => n.id === noteId);
    if (selectedNote) {
      setActiveNoteId(noteId);
      setNoteContent(selectedNote.content);
    }
  };
  
  const exportNotes = () => {
    if (!activeCase || notes.length === 0) return;
    
    const notesText = notes.map(note => {
      const date = new Date(note.timestamp).toLocaleString();
      return `--- Note from ${date} ---\n\n${note.content}\n\n`;
    }).join('\n');
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `chainhound-notes-${activeCase.name.replace(/\s+/g, '-')}-${timestamp}.txt`;
    
    // Create and download file
    const blob = new Blob([notesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const copyToClipboard = () => {
    if (!noteContent) return;
    
    navigator.clipboard.writeText(noteContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-500" />
            Investigation Notes
          </h2>
          <div className="flex items-center gap-2">
            <button 
              className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              onClick={handleCreateNote}
              disabled={!activeCase}
            >
              <Plus className="h-4 w-4" />
              <span>New Note</span>
            </button>
            {notes.length > 0 && (
              <button 
                className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
                onClick={exportNotes}
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          {activeCase ? `Notes for case: ${activeCase.name}` : 'No active case selected'}
        </p>
      </div>
      
      {!activeCase ? (
        <div className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No active case selected</p>
          <p className="text-sm text-gray-500 mt-2">
            Select or create a case to start taking notes
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 h-[500px]">
          <div className="md:col-span-1 border-r border-gray-700 overflow-y-auto">
            {notes.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-gray-400">No notes yet</p>
                <button
                  className="mt-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  onClick={handleCreateNote}
                >
                  Create First Note
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notes.map(note => (
                  <div 
                    key={note.id} 
                    className={`p-3 cursor-pointer ${activeNoteId === note.id ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                    onClick={() => handleNoteSelect(note.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-300 line-clamp-2">
                          {note.content || 'Empty note'}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(note.timestamp)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="p-1 text-gray-500 hover:text-red-400 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="md:col-span-2 flex flex-col h-full">
            <div className="p-3 border-b border-gray-700 bg-gray-900 flex justify-between items-center">
              <div className="text-sm text-gray-400">
                {activeNoteId ? 'Edit Note' : 'No note selected'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  disabled={!noteContent}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={!activeNoteId}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-3 w-3" />
                  <span>Save</span>
                </button>
              </div>
            </div>
            
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder={activeNoteId ? "Type your investigation notes here..." : "Select or create a note to start writing"}
              disabled={!activeNoteId}
              className="flex-1 w-full bg-gray-800 text-gray-200 p-4 border-none outline-none resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteScratchpad;